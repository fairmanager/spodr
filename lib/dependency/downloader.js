"use strict";

const Promise = require( "bluebird" );

const crypto                 = require( "crypto" );
const DownloaderStatistics   = require( "./downloaderStatistics" );
const downloadNpmPackage     = require( "download-npm-package" );
const downloadPackageTarball = require( "download-package-tarball" );
const fs                     = Promise.promisifyAll( require( "fs" ) );
const log                    = require( "fm-log" ).module();
const npmPackageArg          = require( "npm-package-arg" );
const path                   = require( "path" );
const rimrafAsync            = Promise.promisify( require( "rimraf" ) );
const Script                 = require( "./script" );

/** @typedef DependencyTree = require( "./tree" ) */
/** @typedef DependencyTreeNode = require( "./treeNode" ) */

/**
 * Retrieves dependencies in a dependency tree from where their respective sources
 * and stores them in the designated storage area.
 */
class DependencyDownloader {
	/**
	 * Construct a downloader for dependencies in a dependency tree.
	 * @param {DependencyTree} dependencyTree
	 */
	constructor( dependencyTree ) {
		/**
		 * The tree we are about to process.
		 * @type {DependencyTree}
		 **/
		this.dependencyTree = dependencyTree;

		/**
		 * Where we will store all downloaded packages.
		 * @type {String}
		 */
		this.storageRoot = DependencyDownloader.DEFAULT_STORAGE_LOCATION;

		/**
		 * Statistics about the download progress and result.
		 * @type {DownloaderStatistics}
		 */
		this.statistics = new DownloaderStatistics();
	}

	/**
	 * Where we will store packages if no other location is configured.
	 * @type {String}
	 */
	static get DEFAULT_STORAGE_LOCATION() {
		return path.join( process.cwd(), ".packages" );
	}

	/**
	 * Delete the entire contents of the storage area, but not the storage area itself.
	 * @return {Promise<null>}
	 */
	clean() {
		return rimrafAsync( path.join( this.storageRoot, "*" ) )
			.return( null );
	}

	/**
	 * Create the storage area.
	 * @return {Promise<null>}
	 */
	prepare() {
		return fs.mkdirAsync( this.storageRoot )
			.catchReturn( {
				code : "EEXIST"
			}, null )
			.return( null );
	}

	/**
	 * Download all known dependencies that are not yet registered as branches on the tree.
	 * @param {Boolean} [forceResolve=false] Should all semver ranges be checked against the registry again?
	 * @param {Number} [concurrentDownloads=4] How many downloads should be processed simultaneously?
	 */
	download( forceResolve = false, concurrentDownloads = 4 ) {
		return this.prepare()
			.then( () => {
				// When updating, ensure we also have integrity information for the root projects.
				if( forceResolve ) {
					return Promise.map( this.dependencyTree.root.branches, branch => {
						if( branch.integrity ) {
							return null;
						}

						const versionTag = `${branch.name}@${branch.version}`;
						return this.dependencyTree.versionResolver.resolve( versionTag )
							.then( json => {
								if( json.dist ) {
									branch.tarball   = json.dist.tarball;
									branch.integrity = json.dist.integrity;
								}
							} )
							.catch( error => {
								log.debug( `'${error.host}${error.path}' failed to resolve. Package possibly not published.` );
								branch.integrity = true;
							} );
					} );
				}
				return null;
			} )
			.then( () => {
				const dependencyList    = this.dependencyTree.condensedDependencyList();
				const dependencyCount   = dependencyList.size;
				const totalVersionCount = Array.from( dependencyList.keys() )
					.reduce( ( count, dependency ) => count += dependencyList.get( dependency ).size, 0 );

				if( totalVersionCount === 0 ) {
					log.notice( "Nothing to do at this stage. Tree complete." );
					return null;
				}

				log.notice( `Resolving ${totalVersionCount} versions of ${dependencyCount} packages…` );

				this.statistics.packagesTotal          = totalVersionCount;
				this.statistics.packagesAlreadyInCache = 0;
				this.statistics.packagesFailed         = 0;
				this.statistics.progressStep           = Math.pow( 10, Math.ceil( Math.log( this.statistics.packagesTotal ) / Math.LN10 ) - 2 );
				this.statistics.nextProgressUpdate     = this.statistics.progressStep;

				return Promise.map( Array.from( dependencyList.keys() )
					.sort()
					.reverse(), dependency => {
					const versions = Array.from( dependencyList.get( dependency ) );
					return this.__downloadAllVersionsOf( dependency, versions, forceResolve )
						.then( this.__emitProgressAsRequired() );
				}, {
					concurrency : concurrentDownloads
				} );
			} )
			.then( () => {
				if( this.statistics.packagesTotal === 0 ) {
					return null;
				}

				log.notice( `Downloaded ${this.statistics.packagesDownloaded} of ${this.statistics.packagesTotal} (${this.statistics.packagesAlreadyInCache} already in cache, ${this.statistics.packagesFailed} failed).` );
				return null;
			} )
			.return( this.statistics );
	}

	/**
	 * Emit a progress indicator message, but don't show too many of them, depending on the work being done.
	 * @private
	 * @return {undefined}
	 */
	__emitProgressAsRequired() {
		if( !this.statistics.packagesDownloaded ) {
			return;
		}

		const packagesProcessed = this.statistics.packagesDownloaded + this.statistics.packagesAlreadyInCache + this.statistics.packagesFailed;
		if( this.statistics.nextProgressUpdate <= packagesProcessed ) {
			if( !this.statistics.__emitterBlocked ) {
				log.info( `${packagesProcessed} of ${this.statistics.packagesTotal} (${Math.round( packagesProcessed / this.statistics.packagesTotal * 10000 ) / 100}%) processed.` );
				this.statistics.block();
			}
			this.statistics.nextProgressUpdate = packagesProcessed + this.statistics.progressStep;
		}
	}

	/**
	 * Download a given set of semver ranges for a given dependency.
	 * @param {String} dependency The name of the dependency.
	 * @param {Array<String>} versions All semver ranges that are to be retrieved for this package.
	 * @param {Boolean} forceResolve Should all semver ranges be checked against the registry again?
	 */
	__downloadAllVersionsOf( dependency, versions, forceResolve ) {
		return Promise.each( versions, version => {
			const versionTag  = `${dependency}@${version}`;
			const versionHash = `${dependency}@${DependencyDownloader.makeVersionHash( version )}`;
			const oldPath     = path.join( this.storageRoot, dependency );
			const newPath     = path.join( this.storageRoot, versionHash );

			const cachedPackage = this.dependencyTree.getPackageFromAggregateCache( dependency, version );

			if( cachedPackage ) {
				log.debug( `Package '${versionTag}' is already tagged in the tree.` );
				++this.statistics.packagesAlreadyInCache;
				return null;
			}

			return this.dependencyTree.lstatAsync( newPath )
				.catchReturn( null )
				.then( stat => {
					if( !forceResolve && stat ) {
						log.debug( `Package '${versionTag}' is already tagged in the cache. Tagging it in the tree.` );
						this.dependencyTree.storePackageInAggregateCache( this.dependencyTree.makeTreeNode( require( path.join( newPath, "package.json" ) ), newPath ), version );
						++this.statistics.packagesAlreadyInCache;
						return null;
					}

					// We request the package.json that matches the requested version tag.
					return this.dependencyTree.versionResolver.resolve( versionTag );
				} )
				.then( packageJson => {
					if( !packageJson ) {
						// Package was already tagged in cache.
						return null;
					}

					if( !packageJson.name ) {
						log.warn( `Package '${versionTag}' could not be resolved. Possibly not a package in the registry.` );
						++this.statistics.packagesFailed;
						return null;
					}
					const versionTagResulting  = `${dependency}@${packageJson.version}`;
					const versionHashResulting = `${dependency}@${DependencyDownloader.makeVersionHash( packageJson.version )}`;

					log.debug( `'${versionTag}' resolved to '${versionTagResulting}'.` );

					// Check if the package this version resolved to is already in the cache.
					const newPathResulting = path.join( this.storageRoot, versionHashResulting );
					return this.dependencyTree.lstatAsync( newPathResulting )
						.catchReturn( null )
						.then( statResulting => {
							if( statResulting ) {
								log.debug( `Package '${versionTagResulting}' is already in the cache.` );
								++this.statistics.packagesAlreadyInCache;

								// Read the version of the package this tag resolved to, then find the resolved package
								// and register it in the cache under the requested version tag.
								const resolvedPackage    = require( path.join( newPathResulting, "package.json" ) );
								const resolvedVersion    = resolvedPackage.version;
								const resolvedDependency = this.dependencyTree.getPackageFromAggregateCache( dependency, resolvedVersion );
								if( resolvedDependency ) {
									// The semver range for this package was not registered on the tree. When
									// looking for the hash, we found a target package that matches the range.
									// The target package is already on the tree. So we establish a link for
									// this version in the cache.
									this.dependencyTree.storePackageInAggregateCache( resolvedDependency, version );

								} else {
									// The semver range for this package was not registered on the tree. When
									// looking for the hash, we found a target package that matches the range.
									// The target package was previously unknown. So we construct a branch
									// for this package.
									this.dependencyTree.storePackageInAggregateCache( this.dependencyTree.makeTreeNode( packageJson || resolvedPackage, newPathResulting ), version );
								}

								return true;
							}

							return this.__downloadAndMove( packageJson, versionTag, versionTagResulting, versionHashResulting, oldPath, newPathResulting )
								.return( false );
						} )
						.then( wasAlreadyInCache => {
							const isFixedVersion = newPath === newPathResulting;
							if( isFixedVersion ) {
								return false;
							}

							if( !wasAlreadyInCache ) {
								// Store the FS information for the newly downloaded package into the stat cache.
								this.dependencyTree.statCache.set( newPathResulting, fs.lstatAsync( newPathResulting ) );

								// Register the original semver range in the aggregate cache, so it points to the resolved version.
								const packageNode = this.dependencyTree.getPackageFromAggregateCache( dependency, packageJson.version );
								this.dependencyTree.storePackageInAggregateCache( packageNode, version );
							}

							log.debug( `Linking '${newPath}' → ${newPathResulting}…` );
							// We check once more if the link already exists. It's possible that we ended up here, because
							// we were updating packages and forcing them to be resolved again.
							return this.dependencyTree.lstatAsync( newPath )
								.catchReturn( null )
								.then( stat => {
									if( stat ) {
										return null;
									}

									return fs.symlinkAsync( newPathResulting, newPath, "junction" );
								} )
								.return( true );
						} )
						.then( shouldUpdateNewPath => {
							if( !shouldUpdateNewPath ) {
								return null;
							}

							this.dependencyTree.statCache.set( newPath, fs.lstatAsync( newPath ) );
						} );
				} )
				.catch( error => {
					log.error( `Failed to store '${versionTag}'! (${error.message || error.msg})` );
					++this.statistics.packagesFailed;
					return null;
				} );
		} );
	}

	/**
	 * Download a specific version of a package and then move it to a tagged location.
	 * @param {Object} packageJson The contents of the `package.json` for this module.
	 * @param {String} originalVersionTag The version tag that caused us to look up this module.
	 * @param {String} versionTag The version tag we ultimately resolved to.
	 * @param {String} versionHash The hashed version.
	 * @param {String} from The location to download the package to.
	 * @param {String} to The location to move the package to after it has been downloaded.
	 * @return {Promise<null>}
	 * @private
	 */
	__downloadAndMove( packageJson, originalVersionTag, versionTag, versionHash, from, to ) {
		log.notice( `Downloading '${versionTag}'…` );
		this.statistics.unblock();

		let downloadPromise = null;

		const parsedPackageArg = npmPackageArg( originalVersionTag );
		if( parsedPackageArg.type === "git" ) {
			downloadPromise = Promise.resolve( downloadPackageTarball( {
				url : parsedPackageArg.hosted.tarball( {
					committish : "HEAD"
				} ),
				dir : this.storageRoot
			} ) );

		} else if( parsedPackageArg.type === "remote" ) {
			downloadPromise = Promise.resolve( downloadPackageTarball( {
				url : parsedPackageArg.saveSpec,
				dir : this.storageRoot
			} ) );

		} else {
			downloadPromise = Promise.resolve( downloadNpmPackage( {
				arg : versionTag,
				dir : this.storageRoot
			} ) );
		}

		return downloadPromise
			.then( () => {
				// Register possible preinstall scripts.
				if( packageJson.scripts ) {
					if( packageJson.scripts.preinstall ) {
						log.info( `Registering 'preinstall' script for '${versionTag}'…` );
						this.dependencyTree.registerScript( new Script( versionTag, "preinstall", to ) );
					}
				}
			} )
			.then( () => { // eslint-disable-line arrow-body-style
				// Move the package from the download location to the target location.
				return fs.renameAsync( from, to );
			} )
			.then( () => { // eslint-disable-line arrow-body-style
				log.debug( `Stored '${versionTag}' as '${versionHash}'.` );
				++this.statistics.packagesDownloaded;

				// Register possible install/postinstall scripts.
				if( packageJson.scripts ) {
					if( packageJson.scripts.install ) {
						log.info( `Registering 'install' script for '${versionTag}'…` );
						this.dependencyTree.registerScript( new Script( versionTag, "install", to ) );
					}
					if( packageJson.scripts.postinstall ) {
						log.info( `Registering 'postinstall' script for '${versionTag}'…` );
						this.dependencyTree.registerScript( new Script( versionTag, "postinstall", to ) );
					}
				}

				// If the `from` location is in the cache, we need to purge it from the cache.
				// Otherwise the cache will have false information after the directory was moved.
				this.dependencyTree.statCache.delete( from );
				// Ensure the new location is available in the cache on the next request.
				this.dependencyTree.statCache.set( to, fs.lstatAsync( to ) );

				// Create the actual branch on the tree.
				this.dependencyTree.root.branchFromExistingPackage( packageJson, to );

				return null;
			} );
	}

	/**
	 * Generate a hash for a version string.
	 * @param {String} version A version tag.
	 * @return {String} The hash for the version tag.
	 */
	static makeVersionHash( version ) {
		return crypto.createHash( "sha256" )
			.update( version )
			.digest( "hex" );
	}
}

module.exports = DependencyDownloader;
