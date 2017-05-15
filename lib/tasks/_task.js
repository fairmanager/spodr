"use strict";

const Promise = require( "bluebird" );

const errors     = require( "../errors" );
const fs         = Promise.promisifyAll( require( "fs" ) );
const path       = require( "path" );

class BaseTask {
	constructor( repository, config ) {
		this.repository   = repository;
		this.config       = config;
		this.repoPath     = path.join( repository.target || process.cwd(), repository.name );
		this._createTries = 0;
	}

	get packageJson() {
		return path.join( this.repoPath, "package.json" );
	}

	createRepoPath() {
		return fs.mkdirAsync( this.repoPath )
			.catch( {
				code : "EPERM"
			}, err => {
				if( this._createTries < 5 ) {
					this.createRepoPath();
				} else {
					throw err;
				}
			} );
	}

	checkRepoPath() {
		return fs.statAsync( this.repoPath )
			.then( stats => {
				if( !stats.isDirectory() ) {
					throw new errors.DirectoryNotExistsError( `Repository path is not a directory '${this.repoPath}'` );
				}
			} )
			.catch( {
				code : "ENOENT"
			}, () => {
				throw new errors.DirectoryNotExistsError( `Repository path does not exist '${this.repoPath}'` );
			} );
	}
}

module.exports = BaseTask;
