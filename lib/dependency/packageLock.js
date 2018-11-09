"use strict";

const log = require( "fm-log" ).module();

class DependencyContainer {
	constructor( parent ) {
		/** @type {Map<String,Map<String,DependencyTreeNode>>} */
		this.aggregateCache = new Map();
		Object.defineProperty( this, "aggregateCache", {
			enumerable : false
		} );

		this.parent = parent;
		Object.defineProperty( this, "parent", {
			enumerable : false
		} );

		this.dependencies = undefined;
	}

	tagVersionOnBranch( name, versionTag, dependencyNode = true ) {
		if( !this.aggregateCache.has( name ) && ( !this.parent || !this.parent.checkBranchForVersion( name, versionTag ) ) ) {
			this.aggregateCache.set( name, new Map() );
		}

		const versionCache = this.aggregateCache.get( name );
		if( versionCache.has( versionTag ) ) {
			return;
		}

		versionCache.set( versionTag, dependencyNode );
	}

	checkBranchForPackage( name ) {
		if( this.parent ) {
			const parentHit = this.parent.checkBranchForPackage( name );
			if( parentHit ) {
				return parentHit;
			}
		}

		if( !this.aggregateCache.has( name ) ) {
			return null;
		}

		return this;
	}

	findFirstChildNode( target ) {
		if( !this.parent ) {
			return null;
		}

		if( this.parent === target ) {
			return this;
		}

		return this.parent.findFirstChildNode( target );
	}

	checkBranchForVersion( name, versionTag ) {
		if( this.parent ) {
			const parentHit = this.parent.checkBranchForVersion( name, versionTag );
			if( parentHit ) {
				return parentHit;
			}
		}

		if( !this.aggregateCache.has( name ) ) {
			return null;
		}

		const versionCache = this.aggregateCache.get( name );
		if( !versionCache.has( versionTag ) ) {
			return null;
		}

		return versionCache.get( versionTag );
	}

	findDependency( name ) {
		if( this.dependencies && name in this.dependencies ) {
			return this.dependencies[ name ];
		}

		if( this.parent ) {
			return this.parent.findDependency( name );
		}

		return null;
	}
}

class Dependency extends DependencyContainer {
	constructor( root, parent, version, integrity, tarball ) {
		super( parent );

		this.root = root;
		Object.defineProperty( this, "root", {
			enumerable : false
		} );

		this.version   = version;
		this.integrity = integrity;
		this.resolved  = tarball;
		this.requires  = undefined;

		this.treeNode = null;
		Object.defineProperty( this, "treeNode", {
			enumerable : false
		} );
	}

	static fromTreeNode( root, parent, treeNode ) {
		const dependency = new Dependency( root, parent, treeNode.version, treeNode.integrity, treeNode.tarball );
		dependency.treeNode = treeNode;

		if( treeNode.branches.length ) {
			dependency.requires = treeNode.branches.reduce( ( dependencies, branch ) => {
				dependencies[ branch.name ] = branch.version;
				return dependencies;
			}, {} );
		}

		return dependency;
	}
}

class VersionCacheEntry {
	constructor( treeNode, depth ) {
		this.treeNode        = treeNode;
		this.lowestDepthSeen = depth;
		this.dependants      = new Set();
	}
}

class PackageLock extends DependencyContainer {
	constructor( name, version ) {
		super( null );

		this.name             = name;
		this.version          = version;
		this.lockfileVersion  = 1;
		this.requires         = true;
		this.preserveSymlinks = process.env.NODE_PRESERVE_SYMLINKS;
	}

	static generate( dependencyTreeNode ) {
		const packageLock = new PackageLock( dependencyTreeNode.name, dependencyTreeNode.version );

		// For all branches on the node,
		// collect all sub-branches into a cache, that maps
		// package names to a Map of version numbers to a Set of TreeNodes that depend on these versions.
		const versionCache = new Map();

		// While traversing the tree, sort all nodes into a map that maps
		// tree depth to a Set of TreeNodes.
		const depthCache = new Map();
		PackageLock.__collectVersionsIntoCache( dependencyTreeNode, versionCache, depthCache );

		// We use this cache to understand which versions are used in the entire tree.
		log.info( `${dependencyTreeNode.name} has ${versionCache.size} packages in the dependency tree.` );
		// We use that map to iterate over the nodes in depth steps.
		log.info( `The dependency tree has ${depthCache.size} levels at the deepest branch.` );

		// We now need to determine for each package version, at which parent it can appear.
		// For every version of every package in the cache, look which nodes depend on it.

		// Packages with a single version in the tree.
		Array.from( versionCache.entries() ).forEach( elementEntry => {
			const [
				packageName,
				versions ] = elementEntry;

			if( versions.size === 1 ) {
				const solePackage = Array.from( versions.values() )[ 0 ];
				packageLock.dependencies                = packageLock.dependencies || {};
				packageLock.dependencies[ packageName ] = Dependency.fromTreeNode( packageLock, packageLock, solePackage.treeNode );
				versionCache.delete( packageName );
			}
		} );

		// Packages that already live on the root level.
		Array.from( versionCache.entries() ).forEach( elementEntry => {
			const [
				packageName,
				versions ] = elementEntry;

			versions.forEach( ( versionEntry, version ) => {
				if( versionEntry.lowestDepthSeen === 0 ) {
					const solePackageVersion = version;
					packageLock.dependencies                = packageLock.dependencies || {};
					packageLock.dependencies[ packageName ] = Dependency.fromTreeNode( packageLock, packageLock, versionEntry.treeNode );
					versions.delete( solePackageVersion );
				}
			} );
		} );

		// The remaining packages either conflict with a root dependency or with a dependency
		// somewhere else in the tree and none of them are dependencies of the root project.

		// Of the remaining packages, if a package is not yet registered on the root, we promote
		// the most depended upon version to the root and leave the remaining versions as conflicts
		// in the cache.
		Array.from( versionCache.entries() ).forEach( elementEntry => {
			const [
				packageName,
				versions ] = elementEntry;

			if( packageLock.dependencies && packageLock.dependencies[ packageName ] ) {
				return;
			}

			const mostUsed = Array.from( versions.entries() ).reduce( ( favoriteEntry, candidateEntry ) => {
				const [
					favoriteVersion, // eslint-disable-line no-unused-vars
					favorite ] = favoriteEntry;
				const [
					candidateVersion, // eslint-disable-line no-unused-vars
					candidate ] = candidateEntry;

				if( favorite.dependants.size < candidate.dependants.size ) {
					return candidateEntry;
				}

				return favoriteEntry;
			} );

			const solePackageVersion = mostUsed[ 0 ];
			const solePackage        = mostUsed[ 1 ];
			packageLock.dependencies                = packageLock.dependencies || {};
			packageLock.dependencies[ packageName ] = Dependency.fromTreeNode( packageLock, packageLock, solePackage.treeNode );
			versions.delete( solePackageVersion );
		} );

		if( packageLock.dependencies ) {
			Object.keys( packageLock.dependencies ).forEach( dependencyName => {
				packageLock.tagVersionOnBranch( dependencyName, packageLock.dependencies[ dependencyName ].version );
			} );
			Object.keys( packageLock.dependencies ).forEach( dependencyName => {
				__makeDependencies( packageLock, packageLock.dependencies[ dependencyName ], packageLock.dependencies[ dependencyName ].treeNode.branches );
			} );
		}

		return packageLock;
	}

	static __collectVersionsIntoCache( dependencyTreeNode, packageCache, depthCache, depth = 0 ) {
		const isBranchStale = dependencyTreeNode.branches.reduce( ( branchIsStale, treeNode ) => {
			let versionMap = packageCache.get( treeNode.name );
			if( !versionMap ) {
				versionMap = new Map();
				packageCache.set( treeNode.name, versionMap );
			}

			let treeNodeSet = versionMap.get( treeNode.version );
			if( !treeNodeSet ) {
				treeNodeSet = new VersionCacheEntry( treeNode, depth );
				versionMap.set( treeNode.version, treeNodeSet );

				// Also store the node itself in the depth cache.
				let depthSet = depthCache.get( depth );
				if( !depthSet ) {
					depthSet = new Set();
					depthCache.set( depth, depthSet );
				}
				depthSet.add( treeNode );

				// As this version of this package (which is a dependency of dependencyTreeNode),
				// was not yet registered, this is not a "stale" branch. Meaning the dependencies
				// of dependencyTreeNode also need to be registered.
				branchIsStale = false;
			}

			// Check if we're seeing this package version at a lower level than earlier.
			if( depth < treeNodeSet.lowestDepthSeen ) {
				treeNodeSet.lowestDepthSeen = depth;

				const depthSet = depthCache.get( depth );
				depthSet.add( treeNode );
			}

			if( !treeNodeSet.dependants.has( dependencyTreeNode ) ) {
				// Register this dependency in the set.
				treeNodeSet.dependants.add( dependencyTreeNode );
			}

			return branchIsStale;
		}, true );

		if( !isBranchStale ) {
			dependencyTreeNode.branches.forEach( treeNode => PackageLock.__collectVersionsIntoCache( treeNode, packageCache, depthCache, depth + 1 ) );
		}
	}
}

function __makeDependencies( root, parent, treeNodes = [] ) {
	treeNodes.forEach( treeNode => {
		// Check if this version of the package is already in the tree.
		if( parent.checkBranchForVersion( treeNode.name, treeNode.version ) ) {
			// This version is already available on the tree. Nothing to do.
			return;
		}

		const dependencyNode = Dependency.fromTreeNode( root, parent, treeNode );
		parent.dependencies                  = parent.dependencies || {};
		parent.dependencies[ treeNode.name ] = dependencyNode;
		parent.tagVersionOnBranch( treeNode.name, treeNode.version, dependencyNode );

		__makeDependencies( root, dependencyNode, treeNode.branches );
	} );
}

module.exports = PackageLock;
