"use strict";

const Dependency = require( "./dependency" );
const log        = require( "fm-log" ).module();
const path       = require( "path" );

/**
 * A DependencyTreeNode is a fully resolved package that resides in the package storage area.
 */
class DependencyTreeNode {
	/**
	 * Constructs a new `DependencyTreeNode`.
	 * @param {DependencyTree} tree The tree this node is a branch on.
	 * @param {Object} json The contents of the `package.json` for this node.
	 */
	constructor( tree = null, json = null ) {
		/**
		 * The name of the pacakge.
		 * @type {String}
		 */
		this.name = json ? json.name : "ROOT";

		/**
		 * The version of the package.
		 * @type {String}
		 */
		this.version = json ? json.version : "*";

		/**
		 * The contents of the `package.json` relating to this node.
		 * @type {Object}
		 */
		this.package = json;

		/**
		 * A reference back to the tree this node lives on.
		 * @type {DependencyTree}
		 */
		this.tree = tree;

		/**
		 * The dependencies on a node are, contrary to branches, not yet resolved to other
		 * nodes on the tree. They still need to be downloaded or resolved.
		 * @type {Array<Dependency>}
		 */
		this.dependencies = DependencyTreeNode.__dependenciesFromPackage( this.package );

		/**
		 * The branches on a node are the resolved dependencies.
		 * These are dependencies on disk that are already tagged in the tree.
		 * @type {Array<DependencyTreeNode>}
		 */
		this.branches = [];

		/**
		 * When resolving dependencies on this node, when we're seeing a package that is pinned,
		 * use that package instead of one that would match the requested semver range.
		 * @type {Array<DependencyTreeNode>}
		 */
		this.pinnedVersions = [];

		/**
		 * Where this package resides on disk.
		 * @type {String}
		 */
		this.storageLocation = null;

		/**
		 * Is this a project that lives in the root of the work area?
		 * @type {Boolean}
		 * @default false
		 */
		this.isRootProject = false;

		/**
		 * The tarball location provided by the registry (or alternative source).
		 * This may only be available during update (--update) operations.
		 * @type {String}
		 * @default null
		 */
		this.tarball = null;

		/**
		 * The integrity string provided by the registry (or alternative source).
		 * This may only be available during update (--update) operations.
		 * @type {String}
		 * @default null
		 */
		this.integrity = null;
	}

	/**
	 * Retrieves all the dependencies from a given `package.json`
	 * @param {Object} packageJson The contents of a `pacakge.json`.
	 * @return {Array<Dependency>}
	 */
	static __dependenciesFromPackage( packageJson ) {
		const dependencies = [];
		if( packageJson === null ) {
			return dependencies;
		}

		if( packageJson.dependencies ) {
			dependencies.push( ...Object.keys( packageJson.dependencies ).map( dependency => new Dependency( dependency, packageJson.dependencies[ dependency ] ) ) );
		}
		if( packageJson.peerDependencies ) {
			dependencies.push( ...Object.keys( packageJson.peerDependencies ).map( dependency => new Dependency( dependency, packageJson.peerDependencies[ dependency ] ) ) );
		}
		if( packageJson.devDependencies ) {
			dependencies.push( ...Object.keys( packageJson.devDependencies ).map( dependency => new Dependency( dependency, packageJson.devDependencies[ dependency ], true ) ) );
		}

		return dependencies;
	}

	/**
	 * Load a given `package.json` and register it on the tree.
	 * @param {String} packagePath The path to a `package.json`
	 */
	branchFromExistingPackagePath( packagePath ) {
		this.branchFromExistingPackage( require( packagePath ), path.dirname( packagePath ) );
	}

	/**
	 * Register a package as a branch on the tree.
	 * @param {Object} json The contents of the `package.json` of the package.
	 * @param {String} storageLocation The path where this package is stored on disk.
	 */
	branchFromExistingPackage( json, storageLocation ) {
		const dependencyTreeNode = this.tree.makeTreeNode( json, storageLocation );

		this.branches.push( dependencyTreeNode );
		this.tree.storePackageInAggregateCache( dependencyTreeNode );
	}

	/**
	 * Register a soon-to-be branch.
	 * @param {String} name The name of the dependency.
	 * @param {String} versionTag The version tag.
	 * @param {Boolean} isDevelopmentDependency Is this a development dependency?
	 */
	branchFromDependency( name, versionTag, isDevelopmentDependency ) {
		this.dependencies.push( new Dependency( name, versionTag, isDevelopmentDependency ) );
	}

	/**
	 * Check if this node has a branch for the given dependency.
	 * @param {String} packageName The name of the package to look for.
	 * @return {Boolean}
	 */
	hasBranchFor( packageName ) {
		return this.branches.some( branch => branch.name === packageName );
	}

	/**
	 * Check if this node has a branch for the given dependency and return it.
	 * @param {String} dependencyName The name of the package to look for.
	 * @return {DependencyTreeNode}
	 */
	dependencyByName( dependencyName ) {
		return this.branches.find( branch => branch.name === dependencyName );
	}

	/**
	 * For all dependencies declared on this node, check if they can be resolved to existing branches in the
	 * aggregate cache.
	 */
	resolveDependencies() {
		const unresolved = [];
		this.dependencies.forEach( dependency => {
			if( dependency.isDevelopmentDependency && !this.tree.considersDevDependencies ) {
				unresolved.push( dependency );
				return;
			}

			// Try to find the dependency among the root branches.
			const rootBranch = this.tree.root.pinnedVersions.find( treeNode => treeNode.name === dependency.name );
			if( rootBranch ) {
				if( dependency.requestedVersion !== rootBranch.version ) {
					log.notice( `Replacing dependency in '${this.name}@${this.version}' on '${dependency.name}@${dependency.requestedVersion}' with root package '${rootBranch.name}@${rootBranch.version}'.` );
				}
				dependency.resolvedVersion = rootBranch.version;
				this.branches.push( rootBranch );
				return;
			}

			const cachedPackageNode = this.tree.getPackageFromAggregateCache( dependency.name, dependency.requestedVersion );
			if( !cachedPackageNode ) {
				unresolved.push( dependency );
				return;
			}

			dependency.resolvedVersion = cachedPackageNode.package.version;
			this.branches.push( cachedPackageNode );
		} );
		this.dependencies = unresolved;
	}

	toString() {
		return `${this.name}@${this.version}`;
	}
}

module.exports = DependencyTreeNode;
