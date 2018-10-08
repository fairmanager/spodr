"use strict";

const GitWrapper = require( "./../git/git" );
const Promise    = require( "bluebird" );

const errors = require( "../errors" );
const fs     = Promise.promisifyAll( require( "fs" ) );
const log    = require( "fm-log" ).module();

class Utility {
	static checkRepoPath( repoPath ) {
		return fs.statAsync( repoPath )
			.then( stats => {
				if( !stats.isDirectory() ) {
					throw new errors.DirectoryNotExistsError( `Repository path is not a directory '${repoPath}'` );
				}
			} )
			.catch( {
				code : "ENOENT"
			}, () => {
				throw new errors.DirectoryNotExistsError( `Repository path does not exist '${repoPath}'` );
			} );
	}

	static isClean( repository ) {
		log.debug( `Checking ${repository.path}…` );
		const git = new GitWrapper( repository.path );
		git.prefix( repository.name );

		return git.status()
			.then( status => {
				if( !status ) {
					log.debug( `'${repository.name}' probably not a git checkout. Skipping.` );
					repository.isClean = true;

				} else {
					repository.isClean = status.isClean();
				}

				return repository;
			} )
			.catch( errors.GitCheckoutNotFoundError, () => {
				log.info( `'${repository.path}' is not a git checkout. Skipping.` );
				return null;
			} );
	}
}

module.exports = Utility;
