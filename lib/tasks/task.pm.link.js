"use strict";

const BaseTask = require( "./_task" );
const Promise  = require( "bluebird" );

const _          = require( "lodash" );
const cliLog     = require( "../utils/cli-log" );
const errors     = require( "../errors" );
const execa      = require( "execa" );
const fs         = Promise.promisifyAll( require( "fs" ) );
const log        = require( "fm-log" ).module();
const path       = require( "path" );
const whichAsync = Promise.promisify( require( "which" ) );

class PackageManagerLinkTask extends BaseTask {
	constructor( repository, options ) {
		super( repository, options );
	}

	process() {
		return this.getPackageJson()
			.bind( this )
			.then( this.getPackageManagerPath )
			.then( this.link )
			.catch( errors.PackageJsonNotFoundError, () => {
				log.info( `'${this.repository.name}' is not a NodeJS project. Skipping.` );
			} );
	}

	getPackageManagerPath() {
		return whichAsync( "yarn" )
			.catch( err => {
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
			}, err => {
				throw new errors.PackageJsonNotFoundError( `No package.json present '${this.repoPath}'` );
			} );
	}

	link( packageManagerPath ) {
		if( this.repository.link === true ) {
			log.notice( `Globally linking module '${this.repository.name}'` );
			cliLog( packageManagerPath, [ "link" ], this.repoPath, log );
			return execa( packageManagerPath, [ "link" ], {
				cwd : this.repoPath
			} )
				.catch( error => {
					log.error( error.stderr );
					throw error;
				} );

		} else {
			log.info( `Option 'link' is not enabled for '${this.repository.name}'. Skipping.` );
			return Promise.resolve();
		}
	}
}

function taskFactory( repository, options ) {
	const task = new PackageManagerLinkTask( repository, options );
	return task.process();
}

module.exports = taskFactory;
