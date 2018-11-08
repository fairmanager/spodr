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
const uniqid          = require( "uniqid" );

class VersionResolver {
	constructor() {
		this.resolverCache = new Map();
	}

	resolve( versionTag ) {
		log.debug( `Resolving '${versionTag}'…` );

		if( this.resolverCache.has( versionTag ) ) {
			return this.resolverCache.get( versionTag );
		}

		let promise = null;

		const parsedPackageArg = npmPackageArg( versionTag );
		if( parsedPackageArg.type === "git" ) {
			log.warn( `spodr can't calculate integrity for '${versionTag}' yet (this is bad). Consider using a published package instead.` );

			promise = getPackageJson( versionTag );
			this.resolverCache.set( versionTag, promise );

			promise.then( packageJson => {
				packageJson.dist = {
					shasum : "missing",
					tarball : parsedPackageArg.hosted.tarball( {
						committish : "HEAD"
					} )
				};
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
			this.resolverCache.set( versionTag, promise );
		}

		return promise;
	}
}

module.exports = VersionResolver;
