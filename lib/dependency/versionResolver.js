"use strict";

const Promise = require( "bluebird" );

const downloadTarball = require( "download-tarball" );
const fs              = Promise.promisifyAll( require( "fs" ) );
const getPackageJson  = require( "get-pkg-json" );
const log             = require( "fm-log" ).module();
const npmPackageArg   = require( "npm-package-arg" );
const os              = require( "os" );
const path            = require( "path" );
const rimrafAsync     = Promise.promisify( require( "rimraf" ) );
const semver          = require( "semver" );
const uniqid          = require( "uniqid" );

class VersionResolver {
	/**
	 * Construct a new `VersionResolver`
	 * @param {Configuration} configuration The configuration of the application.
	 */
	constructor( configuration ) {
		this.configuration = configuration;
		this.resolverCache = new Map();
	}

	/**
	 * Retrieve the `package.json` that matches the requested tag.
	 * @param {String} versionTag The package name and version to retrieve.
	 * @return {Promise<Object>} The `package.json` that matches the requested tag.
	 */
	resolve( versionTag ) {
		log.debug( `Resolving '${versionTag}'…` );

		if( this.resolverCache.has( versionTag ) ) {
			return this.resolverCache.get( versionTag );
		}

		let promise = null;

		const parsedPackageArg = npmPackageArg( versionTag );
		if( parsedPackageArg.type === "git" ) {
			log.warn( `spodr can't calculate integrity for '${versionTag}' yet (this is bad). Consider using a published package instead.` );

			promise = getPackageJson( versionTag )
				.then( packageJson => {
					packageJson.dist = {
						shasum : "missing",
						tarball : parsedPackageArg.hosted.tarball( {
							committish : "HEAD"
						} )
					};

					return packageJson;
				} );

		} else if( parsedPackageArg.type === "remote" ) {
			log.warn( `spodr can't calculate integrity for '${versionTag}' yet (this is bad). Consider using a published package instead.` );

			const targetDirectory = path.join( os.tmpdir(), `spodr-${uniqid()}` );
			promise = Promise.resolve( downloadTarball( {
				url : parsedPackageArg.saveSpec,
				dir : targetDirectory
			} ) )
				.then( () => fs.readdirAsync( targetDirectory ) )
				.then( extractedFiles => {
					const packageJson = require( path.join( targetDirectory, extractedFiles[ 0 ], "package.json" ) );
					packageJson.dist = {
						shasum : "missing",
						tarball : parsedPackageArg.saveSpec
					};

					return rimrafAsync( targetDirectory )
						.return( packageJson );
				} );

		} else {
			promise = getPackageJson( versionTag );
		}

		this.resolverCache.set( versionTag, promise );

		 return promise.then( packageJson => {
			if( !packageJson ) {
				return packageJson;
			}

			const packageLocks = this.configuration.packageManagement.locks.getPackageLocks( packageJson.name );
			if( packageLocks ) {
				const alternativeResolution = packageLocks.find( packageLock => {
					if( packageJson.version !== packageLock.ifVersionMatches && semver.satisfies( packageJson.version, packageLock.ifVersionMatches ) ) {
						return true;
					}

					return false;
				} );

				if( alternativeResolution && packageJson.version !== alternativeResolution.replaceWith ) {
					log.notice( `Replacing dependency '${versionTag}' with version '${alternativeResolution.replaceWith}' because it resolved to '${packageJson.version}' which matches '${alternativeResolution.ifVersionMatches}'.` );
					return this.resolve( `${packageJson.name}@${alternativeResolution.replaceWith}` );
				}
			}

			return packageJson;
		} );
	}
}

module.exports = VersionResolver;
