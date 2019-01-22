"use strict";

const Promise = require( "bluebird" );

const cmdShim                    = Promise.promisify( require( "cmd-shim" ) );
const fs                         = Promise.promisifyAll( require( "fs" ) );
const log                        = require( "fm-log" ).module();
const mkdirpAsync                = Promise.promisify( require( "mkdirp" ) );
const ModulesGeneratorStatistics = require( "./modulesGeneratorStatistics" );
const path                       = require( "path" );
const rimrafAsync                = Promise.promisify( require( "rimraf" ) );

/** @typedef DependencyTree = require( "./tree" ) */

/**
 * Generates `node_modules` folder structures for a dependency tree.
 */
class ModulesGenerator {
	/**
	 * Constructs a new `ModulesGenerator`
	 * @param {DependencyTree} dependencyTree The dependency tree for which to generate node_modules.
	 */
	constructor( dependencyTree ) {
		/**
		 * The dependency tree for which to generate `node_modules`
		 */
		this.dependencyTree = dependencyTree;

		/**
		 * Statistics about this creation run.
		 * @type {ModulesGeneratorStatistics}
		 */
		this.statistics = new ModulesGeneratorStatistics();
	}

	/**
	 * Create links for every branch in the dependency tree.
	 * @param {Number} concurrenctModules How many modules to process concurrently.
	 * @return {Promise<null>}
	 */
	syncDirectories( concurrenctModules ) {
		return this.__clearAllNodeModules( concurrenctModules )
			.then( () => Promise.each( this.dependencyTree.aggregateCache.values(),
				treeModule => Promise.each( treeModule.values(),
					version => Promise.map( version.branches,
						branch => this.__linkBranchIntoNodeModules( version, branch ), {
							concurrency : concurrenctModules
						} )
						.then( () => this.__createBinaryLinks( version ) ) ) ) )
			.return( null );
	}

	/**
	 * Delete `node_modules` for every branch in the dependency tree.
	 * @param {Number} concurrenctModules How many modules to process concurrently.
	 * @return {Promise<null>}
	 */
	__clearAllNodeModules( concurrenctModules ) {
		return Promise.each( this.dependencyTree.aggregateCache.values(),
			treeModule => Promise.each( treeModule.values(),
				version => this.__clearNodeModules( version ), {
					concurrency : concurrenctModules
				} ) )
			.return( null );
	}

	/**
	 * Clears the `node_modules` folder in a module by deleting it.
	 * @param {DependencyTreeNode} moduleParent The module in which to clear the `node_modules`.
	 * @return {Promise<null>}
	 */
	__clearNodeModules( moduleParent ) {
		const nodeModulesPath = path.join( moduleParent.storageLocation, "node_modules" );
		return rimrafAsync( nodeModulesPath, {
			maxBusyTries : 20
		} )
			.return( null );
	}

	/**
	 * Create a link in the `node_modules` directory of a parent, which points to a given dependency.
	 * @param {DependencyTreeNode} moduleParent The tree node that has this branch as a dependency.
	 * @param {DependencyTreeNode} branch The tree node relating to the dependency.
	 * @return {Promise<null>}
	 */
	__linkBranchIntoNodeModules( moduleParent, branch ) {
		const linkSource = branch.storageLocation;
		const linkTarget = path.join( moduleParent.storageLocation, "node_modules", branch.package.name );

		// We first create the entire path, which ensures the `node_modules` themselves are created.
		// Then we delete the link target, which ensures that the link itself is deleted if it already
		// exists, leaving parent directories intact.
		// We then create our symlink.
		return mkdirpAsync( linkTarget )
			.catch( {
				code : "EPERM"
			}, error => {
				log.warn( `${error.message} - Retrying in 100ms. Ctrl+C to abort.` );
				return Promise.delay( 100 )
					.then( () => this.__linkBranchIntoNodeModules( moduleParent, branch ) );
			} )
			.then( () => rimrafAsync( linkTarget ) )
			.delay( 5 )
			.then( () => fs.symlinkAsync( linkSource, linkTarget, "junction" ) )
			.then( () => {
				log.debug( `Linked '${linkTarget}' ← '${linkSource}'.` );
				++this.statistics.linksCreated;
			} )
			.catchReturn( {
				code : "EEXIST"
			}, null )
			.return( null );
	}

	__createBinaryLinks( moduleParent ) {
		return Promise.each( moduleParent.branches, dependency => {
			if( dependency.package.bin ) {
				const scriptCount = Object.keys( dependency.package.bin ).length;
				log.debug( `Creating ${scriptCount} .bin entries for '${dependency.name}@${dependency.version}' in '${moduleParent.name}@${moduleParent.version}'…` );

				if( typeof dependency.package.bin === "string" ) {
					return this.__createLinksForDependency( dependency, moduleParent.storageLocation, dependency.name, dependency.package.bin )
						.then( () => ++this.statistics.linksCreatedBin );
				}

				return Promise.each( Object.keys( dependency.package.bin ), binName => this.__createLinksForDependency( dependency, moduleParent.storageLocation, binName, dependency.package.bin[ binName ] ) )
					.then( () => this.statistics.linksCreatedBin += scriptCount );
			}
		} )
			.return( null );
	}

	__createLinksForDependency( dependency, parentStorageLocation, binName, binTarget ) {
		const linkSource = path.join( dependency.storageLocation, binTarget );
		const linkTarget = path.join( parentStorageLocation, "node_modules", ".bin", binName );

		// As we clear all `node_modules` before starting any work, this can only be an existing
		// link created in a previous iteration. This link will already point to the correct
		// binary.
		return fs.lstatAsync( linkTarget )
			.then( () => true )
			.catchReturn( false )
			.then( alreadyExists => {
				if( !alreadyExists ) {
					return mkdirpAsync( path.dirname( linkTarget ) )
						.then( () => this.__createBinaryLink( linkSource, linkTarget ) )
						.then( () => log.debug( `Linked '${linkTarget}' ← '${linkSource}'.` ) );
				}

				return null;
			} );
	}

	__createBinaryLink( linkSource, linkTarget ) {
		if( process.platform !== "win32" ) {
			return fs.symlinkAsync( linkSource, linkTarget );

		} else {
			return cmdShim( linkSource, linkTarget );
		}
	}
}

module.exports = ModulesGenerator;
