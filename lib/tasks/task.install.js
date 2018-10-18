"use strict";

const Promise = require( "bluebird" );

const DependencyTree       = require( "../dependency/tree" );
const DependencyDownloader = require( "../dependency/downloader" );
const errors               = require( "../errors" );
const fs                   = Promise.promisifyAll( require( "fs" ) );
const log                  = require( "fm-log" ).module();
const ModulesGenerator     = require( "../dependency/modulesGenerator" );
const PackageLock          = require( "../dependency/packageLock" );
const PackageManagerTask   = require( "./task.pm" );
const path                 = require( "path" );

class InstallTask {
	/**
	 * Construct a new `InstallTask`.
	 * @param {Array<Repository>} repositories The repositories to operate on.
	 * @param {Object} options The configuration for the task
	 */
	constructor( repositories, options ) {
		this.repositories = repositories;
		this.options      = options;

		this.__currentLoaderStage = 0;
	}

	process() {
		return this.getNodeJsProjectTasks()
			.then( tasks => {
				log.info( `Considering ${tasks.length} projects.` );

				const packagePaths   = tasks.map( task => path.join( task.repoPath, "package.json" ) );
				const dependencyTree = DependencyTree.fromPackagePaths( packagePaths, true, this.options.pinRoots );

				log.notice( "Downloading stage 0…" );
				const downloader = new DependencyDownloader( dependencyTree );
				return downloader.download( this.options.updateDependencies, this.options.parallelExecutions )
					.then( () => dependencyTree.assemble() )
					.then( () => {
						dependencyTree.considersDevDependencies = false;
						return this.__nextLoaderStage( dependencyTree );
					} )
					.return( dependencyTree );
			} )
			.then( dependencyTree => {
				let versionCount = 0;
				dependencyTree.aggregateCache.forEach( versions => versionCount += versions.size );
				log.info( `Tree contains ${dependencyTree.aggregateCache.size} discrete packages in ${versionCount} versions.` );

				return dependencyTree;
			} )
			.then( dependencyTree => {
				log.notice( "Registering plugins as peer dependencies…" );
				// eslint-disable-next-line no-unused-vars
				dependencyTree.aggregateCache.forEach( ( versions, dependencyName ) => {
					if( dependencyName.match( /(.+)-plugin/ ) ) {
						const hostname = dependencyName.split( "-plugin" )[ 0 ];
						if( dependencyTree.aggregateCache.has( hostname ) ) {

							log.debug( `Found possible plugin '${dependencyName}' for '${hostname}'.` );
							const hostModule = dependencyTree.aggregateCache.get( hostname );

							log.debug( `'${hostname}' is available in ${hostModule.size} versions. Finding usage combinations…` );
							const dependants = dependencyTree.findDependants( dependencyName );
							dependants.forEach( dependant => {
								const moduleHost = dependant.dependencyByName( hostname );
								if( !moduleHost ) {
									// The plugin host is not a resolved dependency.
									// Most likely, it was declared as a devDependency too far away from the root,
									// or the user declared a dependency on a plugin, but forgot to depend on
									// the host.
									return;
								}

								const moduleDependency = dependant.dependencyByName( dependencyName );
								log.debug( `'${dependant.name}' wants '${dependencyName}@${moduleDependency.version}' for '${hostname}@${moduleHost.version}'.` );

								if( moduleHost.hasBranchFor( dependencyName ) ) {
									log.debug( `'${hostname}@${moduleHost.version}' already depends on '${dependencyName}'.` );
									return;
								}

								moduleHost.branches.push( moduleDependency );
							} );

						} else {
							log.debug( `Module '${dependencyName}' looked like a plugin for '${hostname}', but that wasn't found in the tree.` );
						}
					}
				} );

				return dependencyTree;
			} )
			.then( dependencyTree => {
				log.notice( "Generating node_modules…" );
				const modulesGenerator = new ModulesGenerator( dependencyTree );
				return modulesGenerator.syncDirectories( this.options.parallelExecutions )
					.then( () => log.info( `Created ${modulesGenerator.statistics.linksCreated} links with ${modulesGenerator.statistics.linksCreatedBin} binary pointers.` ) )
					.return( dependencyTree );
			} )
			.then( dependencyTree => {
				if( !dependencyTree.scripts.length ) {
					return dependencyTree;
				}

				log.notice( `Running ${dependencyTree.scripts.length} scripts…` );

				const scriptsPreInstall  = dependencyTree.scripts.filter( script => script.stage === "preinstall" );
				const scriptsInstall     = dependencyTree.scripts.filter( script => script.stage === "install" );
				const scriptsPostInstall = dependencyTree.scripts.filter( script => script.stage === "postinstall" );

				return Promise.each( scriptsPreInstall, script => script.process() )
					.then( () => Promise.each( scriptsInstall, script => script.process() ) )
					.then( () => Promise.each( scriptsPostInstall, script => script.process() ) )
					.return( dependencyTree );
			} )
			.then( dependencyTree => {
				/*
				if( !this.options.updateLockfiles ) {
					return dependencyTree;
				}
				*/

				log.notice( `Generating lockfiles…` );

				// All root projects are always registered as branches on the root.
				// However, additional projects live there too if the tree is being extended.
				// Thus, we need to filter for those marked as root projects explicitly
				const rootProjects = dependencyTree.root.branches.filter( branch => branch.isRootProject );
				return Promise.map( rootProjects, project => {
					const packageLock  = PackageLock.generate( project );
					const lockfilePath = path.join( project.storageLocation, "package-lock.json" );
					log.notice( `Writing '${lockfilePath}'…` );
					return fs.writeFileAsync( lockfilePath, JSON.stringify( packageLock, null, "\t" ) );
				} );
			} );
	}

	__nextLoaderStage( treeToReuse = null ) {
		return ( treeToReuse ?
			Promise.resolve( treeToReuse.assemble() ) :
			DependencyTree.fromStorageRoot( DependencyDownloader.DEFAULT_STORAGE_LOCATION, false ) )
			.then( dependencyTree => {
				log.notice( `Processing stage ${++this.__currentLoaderStage}…` );
				const downloader = new DependencyDownloader( dependencyTree );
				return downloader.download( this.options.updateDependencies, this.options.parallelExecutions )
					.return( downloader );
			} )
			.then( downloader => {
				if( downloader.statistics.packagesDownloaded || this.__currentLoaderStage === 0 ) {
					return this.__nextLoaderStage( downloader.dependencyTree );
				}

				if( downloader.statistics.packagesFailed ) {
					log.warn( `${downloader.statistics.packagesFailed} packages failed to download. Trying one more time…` );
					return downloader.download( this.options.updateDependencies, this.options.parallelExecutions )
						.return( downloader.dependencyTree );
				}

				// Recurse until no more packages were retrieved.
				if( downloader.statistics.packagesAlreadyInCache && downloader.statistics.packagesDownloaded === 0 ) {
					return this.__nextLoaderStage( downloader.dependencyTree );
				}

				return downloader.dependencyTree;
			} );
	}

	getNodeJsProjectTasks() {
		return Promise.map( this.repositories, repository => new PackageManagerTask( repository, null ) )
			.filter( task => task.getPackageJson()
				.return( task )
				.catchReturn( errors.PackageJsonNotFoundError, null ) )
			.filter( Boolean );
	}
}

function taskFactory( repositories, options ) {
	const task = new InstallTask( repositories, options );
	return task.process();
}

module.exports = taskFactory;
