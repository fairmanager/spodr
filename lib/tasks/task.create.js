"use strict";

const BaseTask   = require( "./_task" );
const GitWrapper = require( "./../git/git" );
const Promise    = require( "bluebird" );

const _           = require( "lodash" );
const errors      = require( "../errors" );
const log         = require( "fm-log" ).module();
const rimrafAsync = Promise.promisify( require( "rimraf" ) );

class CloneTask extends BaseTask {
	constructor( repository, config ) {
		super( repository, config );
	}

	process() {
		return this.prepareFilesystem()
			.then( () => {
				log.notice( `Cloning '${this.repository.name}' → '${this.repoPath}'…` );

				let url = this.repository.url;
				if( _.isUndefined( url ) ) {
					url = `git@${this.repository.host}/${this.repository.name}.git`;
				}

				return this.git.clone( url, this.repoPath, [ "--recursive" ] )
					.then( () => this.git.branchList() )
					.then( branchList => {
						// If there is a dev branch, we prefer to use that, even if it's not the default branch.
						if( _.includes( branchList.all, "dev" ) && branchList.current !== "dev" ) {
							return this.git.checkout( "dev" )
								.return( "dev" );
						}

						const defaultBranch = _.filter( branchList.all, branch => !branch.match( /remotes\// ) )[ 0 ];

						return defaultBranch;
					} )
					.then( branch => {
						this.repository.cloned = true;
						log.info( `Checked out '${this.repository.name}' → '${branch}'` );
						return this.repository.name;
					} );
			} )
			.catch( errors.DirectoryExistsError, Function.prototype );
	}

	prepareFilesystem() {
		return this.checkRepoPath()
			.bind( this )
			.then( () => {
				// Path exists
				if( this.config.force ) {
					log.notice( `Cleaning '${this.repoPath}'.` );
					return rimrafAsync( this.repoPath );
				} else {
					throw new errors.DirectoryExistsError( `Repository path already exists '${this.repoPath}'` );
				}
			} )
			.catch( errors.DirectoryNotExistsError, Function.prototype )
			.then( this.createRepoPath )
			.then( () => {
				this.git = new GitWrapper( this.repoPath );
				this.git.prefix( this.repository.name );
				return this.repository.name;
			} );
	}
}

function taskFactory( repository, options ) {
	const task = new CloneTask( repository, options );
	return task.process();
}

module.exports = taskFactory;
