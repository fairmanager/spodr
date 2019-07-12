"use strict";

const Promise = require( "bluebird" );

const BaseTask   = require( "./_task" );
const errors     = require( "../errors" );
const fs         = Promise.promisifyAll( require( "fs" ) );
const log        = require( "fm-log" ).module();
const path       = require( "path" );
const whichAsync = Promise.promisify( require( "which" ) );

class PackageManagerTask extends BaseTask {
	process( pmFunction ) {
		return this.getPackageJson()
			.bind( this )
			.then( this.getPackageManagerPath )
			.then( pmFunction )
			.catch( errors.PackageJsonNotFoundError, () => {
				log.info( `'${this.repository.name}' is not a NodeJS project. Skipping.` );
			} );
	}

	getPackageManagerPath() {
		return whichAsync( this.config.packageManager )
			.catch( () => {
				throw new errors.PackageManagerNotFoundError();
			} );
	}

	getPackageJson() {
		return fs.statAsync( path.join( this.repoPath, "package.json" ) )
			.then( stats => {
				if( !stats.isFile() ) {
					throw new errors.PackageJsonNotFoundError( `No package.json present '${this.repoPath}'` );
				}
			} )
			.catch( {
				code : "ENOENT"
			}, () => {
				throw new errors.PackageJsonNotFoundError( `No package.json present '${this.repoPath}'` );
			} );
	}
}


module.exports = PackageManagerTask;
