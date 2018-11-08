"use strict";

const Promise = require( "bluebird" );

const DependencyTreeNode = require( "./treeNode" );
const errors             = require( "../errors" );
const fs                 = Promise.promisifyAll( require( "fs" ) );
const log                = require( "fm-log" ).module();
const path               = require( "path" );
const VersionResolver    = require( "./versionResolver" );

/** @typedef Script = require( "./script" ) */

/**
 * The `DependencyTree` maintains which which pacakges depend on each other.
 */
class DependencyTree {
	/**
	 * Construct a new `DependencyTree`.
	 * @param {Boolean} withDevDependencies Should devDependencies be considered in this tree's operations.
	 */
	constructor( withDevDependencies ) {
		/** @type {DependencyTreeNode} */
		this.root = new DependencyTreeNode( this );

		/** @type {Boolean} */
		this.considersDevDependencies = withDevDependencies;

		/** @type {Map<String,Promise<Stats>>} */
		this.statCache = new Map();

		/** @type {Map<String,Map<String,DependencyTreeNode>>} */
		this.aggregateCache = new Map();

		/** @type {VersionResolver} */
		this.versionResolver = new VersionResolver();

		/** @type {Array<Script>} */
		this.scripts = [];
	}

	/**
	 * Create a new node for this tree. The node will not yet be attached to the tree.
	 * @param {Object} json The contents of the `package.json` for this node.
	 * @param {String} storageLocation Where this node is stored on disk.
	 */
	makeTreeNode( json, storageLocation ) {
		const node = new DependencyTreeNode( this, json );
		node.storageLocation = storageLocation;
		if( json.dist ) {
			node.tarball   = json.dist.tarball;
			node.integrity = json.dist.integrity || `sha1-${Buffer.from( json.dist.shasum, "hex" ).toString( "base64" )}`;
		}

		return node;
	}

	/**
	 * Register a script to be run when the tree was fully processed.
	 * @param {Script} script The script to register.
	 */
	registerScript( script ) {
		this.scripts.push( script );
	}

	/**
	 * Stores a dependency in the aggregate cache.
	 * The aggregate cache maintains a list of all versions of all packages referenced on the tree.
	 * @param {DependencyTreeNode} dependencyTreeNode The dependency to store in the cache.
	 */
	storePackageInAggregateCache( dependencyTreeNode, versionTag = dependencyTreeNode.package.version ) {
		if( !this.aggregateCache.has( dependencyTreeNode.package.name ) ) {
			this.aggregateCache.set( dependencyTreeNode.package.name, new Map() );
		}

		const versionCache = this.aggregateCache.get( dependencyTreeNode.package.name );
		if( versionCache.has( versionTag ) ) {
			// When one package in the tree references a package in the root project area by a semver range,
			// that reference can loop back to the actual package in the project area.
			// spodr can not know this in advance and will download the semver matched package and try to
			// put it into the cache, but the cache already has the root package of the same version.
			// This is nothing to worry about.
			// We should have a switch like --pin-roots to replace all dependency references to root
			// packages with whatever version those are at.
			throw new Error( "Package version is already in cache. Possible range-match to root package." );
		}

		versionCache.set( versionTag, dependencyTreeNode );
	}

	/**
	 * Retrieve a versioned package from the aggregate cache.
	 * @param {String} name The name of the package.
	 * @param {String} versionTag The version of the package to look for.
	 * @return {DependencyTreeNode}
	 */
	getPackageFromAggregateCache( name, versionTag ) {
		if( !this.aggregateCache.has( name ) ) {
			return null;
		}

		const versionCache = this.aggregateCache.get( name );
		if( !versionCache.has( versionTag ) ) {
			return null;
		}

		return versionCache.get( versionTag );
	}

	/**
	 * Retrieves a `Map` of all dependencies at all versions that are currently referenced on the
	 * tree, but which are not pointing to any existing branches.
	 * These dependencies usually still need to be downloaded from a registry.
	 * @return {Map<String,Set<String>>}
	 */
	condensedDependencyList() {
		const listResult = new Map();
		this.aggregateCache
			.forEach( versions => {
				versions.forEach( cachedDependency => {
					cachedDependency.dependencies.forEach( dependency => {
						if( dependency.isDevelopmentDependency && !this.considersDevDependencies ) {
							return;
						}

						if( !listResult.has( dependency.name ) ) {
							listResult.set( dependency.name, new Set() );
						}

						listResult.get( dependency.name ).add( dependency.requestedVersion );
					} );
				} );
			} );

		return listResult;
	}

	/**
	 * Find all tree nodes that declare a dependency on the given package.
	 * @param {String} dependencyName The name of a package.
	 * @return {Array<DependencyTreeNode>}
	 */
	findDependants( dependencyName ) {
		const dependants = [];

		this.aggregateCache
			.forEach( versions => {
				versions.forEach( cachedDependency => {
					cachedDependency.branches.forEach( dependency => {
						if( dependency.name === dependencyName ) {
							dependants.push( cachedDependency );
						}
					} );
				} );
			} );

		return dependants;
	}

	/**
	 * Performs an `lstat` on the given target and returns the result, possibly from the cache.
	 * @param {String} target The path to stat.
	 * @return {Promise<Object>}
	 */
	lstatAsync( target ) {
		if( this.statCache.has( target ) ) {
			return this.statCache.get( target );
		}

		const promise = fs.lstatAsync( target );
		this.statCache.set( target, promise );

		return promise;
	}

	/**
	 * Resolve all dependencies in the aggregate cache.
	 * @return {DependencyTree}
	 */
	assemble() {
		this.aggregateCache.forEach( versions => {
			versions.forEach( version => {
				version.resolveDependencies();
			} );
		} );

		return this;
	}

	pinVersion( packageName, versionToUse ) {
		const pinnable = this.getPackageFromAggregateCache( packageName, versionToUse );
		if( !pinnable ) {
			throw new errors.SpodrError( `Unable to pin version '${versionToUse}' of '${packageName}' as that version wasn't found in the tree.` );
		}
		this.root.pinnedVersions.push( pinnable );
	}

	/**
	 * Construct a new `DependencyTree` from a set of paths to `package.json` files.
	 * @param {Array<String>} paths The paths to `package.json` files to create the tree from.
	 * @param {Boolen} [withDevDependencies=true] Should devDependencies be considered for this tree?
	 * @param {Boolean} [pinRoots=false] When a package depends on a package that lives on the tree root, enfore that
	 * the tree root version is used, regardless of the declared semver range.
	 * @return {DependencyTree}
	 */
	static fromPackagePaths( paths, withDevDependencies = true, pinRoots = false ) {
		const dependencyTree = new DependencyTree( withDevDependencies );
		paths.forEach( packagePath => dependencyTree.root.branchFromExistingPackagePath( packagePath ) );

		if( pinRoots ) {
			dependencyTree.root.branches.forEach( branch => dependencyTree.pinVersion( branch.name, branch.version ) );
		}

		// Mark projects as roots, for easier detection later on.
		dependencyTree.root.branches.forEach( branch => branch.isRootProject = true );

		dependencyTree.assemble();
		return dependencyTree;
	}

	/**
	 * Create a new dependency tree from existing packages in a storage area.
	 * Only actual packages (not linked tags) are considered.
	 * @param {String} storageRoot The location of the packages.
	 */
	static fromStorageRoot( storageRoot, withDevDependencies = false ) {
		log.notice( `Generating dependency tree from '${storageRoot}'…` );
		const statCacheHelper = new DependencyTree();

		return fs.readdirAsync( storageRoot )
			.map( directoryName => {
				if( !directoryName.startsWith( "@" ) ) {
					return [ directoryName ];
				}

				return fs.readdirAsync( path.join( storageRoot, directoryName ) )
					.map( packageName => path.join( directoryName, packageName ) );
			} )
			.reduce( ( allPaths, scopedPaths ) => {
				scopedPaths.forEach( scopedPath => allPaths.push( path.join( storageRoot, scopedPath ) ) );
				return allPaths;
			}, [] )
			.filter( dependencyPath => statCacheHelper.lstatAsync( dependencyPath )
				.then( stat => !stat.isSymbolicLink() ) )
			.map( dependencyPath => path.join( dependencyPath, "package.json" ) )
			.then( packagePaths => DependencyTree.fromPackagePaths( packagePaths, withDevDependencies ) )
			.then( dependencyTree => {
				// Inherit the stat information we just collected to boost performance for future lookups.
				dependencyTree.statCache = statCacheHelper.statCache;
				dependencyTree.collectBinaries();
				return dependencyTree;
			} );
	}
}

module.exports = DependencyTree;
