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
const semver               = require( "semver" );

class InstallTask {
	/**
	 * Construct a new `InstallTask`.
	 * @param {Array<Repository>} repositories The repositories to operate on.
	 * @param {Configuration} configuration The configuration for the task
	 */
	constructor( repositories, configuration ) {
		this.repositories  = repositories;
		this.configuration = configuration;

		this.__currentLoaderStage = 0;
	}

	process() {
		return this.getNodeJsProjectTasks()
			.then( tasks => {
				log.info( `Considering ${tasks.length} projects.` );

				const packagePaths   = tasks.map( task => path.join( task.repoPath, "package.json" ) );
				const dependencyTree = DependencyTree.fromPackagePaths( this.configuration, packagePaths, true, this.configuration.packageManagement.pinRoots );

				log.notice( "Downloading stage 0…" );
				const downloader = new DependencyDownloader( dependencyTree );
				return downloader.download( this.configuration.packageManagement.updateDependencies, this.configuration.parallelExecutions )
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
				log.notice( "Looking for peer dependencies…" );
				this.configuration.packageManagement.peering.forEach( ( peeringOffers, hostPackageName ) => {
					if( !dependencyTree.aggregateCache.has( hostPackageName ) ) {
						log.debug( `Module '${hostPackageName}' was declared as a peering option, but that package wasn't found in the tree.` );
						return;
					}

					const hostModuleVersions = dependencyTree.aggregateCache.get( hostPackageName );

					log.debug( `'${hostPackageName}' is available in ${hostModuleVersions.size} versions. Finding usage combinations for ${peeringOffers.length} peering offers…` );

					for( const offer of peeringOffers ) {
						log.debug( `'${hostPackageName}@${offer.ifVersionMatches}' has ${offer.pluginMap.size} peering offers. Finding matching peers…` );

						// Don't be surprised if this set includes duplicate versions.
						// Multiple semver ranges can resolve to the same package version. This will result in
						// discrete tree nodes that point to the same package on disk. We want to find all
						// tree nodes that point to all relevant versions.
						const relevantHostVersions = new Set();
						hostModuleVersions.forEach( ( hostPackgeTreeNode, hostVersion ) => {
							if( semver.satisfies( hostPackgeTreeNode.version, offer.ifVersionMatches ) ) {
								relevantHostVersions.add( hostPackgeTreeNode );
							}
						} );

						if( !relevantHostVersions.size ) {
							log.debug( `Found no peers matching '${hostPackageName}@${offer.ifVersionMatches}'.` );
							continue;
						}

						const relevantPlugins = new Set();
						offer.pluginMap.forEach( ( allowedVersionRange, packageNamePattern ) => {
							const relevantPluginNames = dependencyTree.findMatchingPackagesInAggregateCache( new RegExp( packageNamePattern ) );
							log.debug( `Found ${relevantPluginNames.length} peers matching '${packageNamePattern}'.` );

							relevantPluginNames.forEach( pluginName => {
								const pluginVersions = dependencyTree.aggregateCache.get( pluginName );
								pluginVersions.forEach( ( pluginPackageTreeNode, pluginVersion ) => {
									if( semver.satisfies( pluginPackageTreeNode.version, allowedVersionRange ) ) {
										relevantPlugins.add( pluginPackageTreeNode );
									}
								} );
							} );
						} );

						if( relevantHostVersions.size && relevantPlugins.size ) {
							log.info( `Registering ${relevantPlugins.size} possible peers in ${relevantHostVersions.size} versions of '${hostPackageName}'…` );
							for( const moduleHost of relevantHostVersions ) {
								for( const modulePlugin of relevantPlugins ) {
									if( moduleHost.hasBranchFor( modulePlugin.name ) ) {
										log.debug( `'${hostPackageName}@${moduleHost.version}' already depends on '${modulePlugin.name}'.` );
										continue;
									}

									log.debug( `Registering '${modulePlugin.name}@${modulePlugin.version}' as a peerDependency of '${hostPackageName}@${moduleHost.version}'.` );
									moduleHost.branches.push( modulePlugin );
								}
							}
						}
					}
				} );

				return dependencyTree;
			} )
			.then( dependencyTree => {
				log.notice( "Generating node_modules…" );
				const modulesGenerator = new ModulesGenerator( dependencyTree );
				return modulesGenerator.syncDirectories( this.configuration.parallelExecutions )
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
			DependencyTree.fromStorageRoot( this.configuration, DependencyDownloader.DEFAULT_STORAGE_LOCATION, false ) )
			.then( dependencyTree => {
				log.notice( `Processing stage ${++this.__currentLoaderStage}…` );
				const downloader = new DependencyDownloader( dependencyTree );
				return downloader.download( this.configuration.packageManagement.updateDependencies, this.configuration.parallelExecutions )
					.return( downloader );
			} )
			.then( downloader => {
				if( downloader.statistics.packagesDownloaded || this.__currentLoaderStage === 0 ) {
					return this.__nextLoaderStage( downloader.dependencyTree );
				}

				if( downloader.statistics.packagesFailed ) {
					log.warn( `${downloader.statistics.packagesFailed} packages failed to download. Trying one more time…` );
					return downloader.download( this.configuration.packageManagement.updateDependencies, this.configuration.parallelExecutions )
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
		const enabledRepositories = this.repositories.filter( repository => repository.install );
		return Promise.map( enabledRepositories, repository => new PackageManagerTask( repository, null ) )
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
