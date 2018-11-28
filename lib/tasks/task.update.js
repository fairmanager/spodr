"use strict";

const Promise = require( "bluebird" );

const _          = require( "lodash" );
const errors     = require( "../errors" );
const GitWrapper = require( "./../git/git" );
const log        = require( "fm-log" ).module();
const utils      = require( "./utils" );

class UpdateTask {
	constructor( config ) {
		this.config = config;
	}

	process() {
		return this.checkWorkingDirectories( this.config.repositories.filter( repo => repo.update === undefined || repo.update === true ) )
			.map( repository => this.update( repository ), {
				concurrency : this.config.parallelExecutions
			} );
	}

	checkWorkingDirectories( repositories ) {
		log.info( "Checking working directories…" );
		log.debug( `${repositories.length} repositories to check.` );

		if( !repositories ) {
			log.warn( "No repositories given. Nothing to do." );
			return Promise.resolve( repositories );
		}

		return Promise.map( repositories, repository => utils.isClean( repository ) )
			.filter( Boolean )
			.then( repos => {
				if( this.config.force ) {
					repos.forEach( repository => {
						if( !repository.isClean ) {
							log.warn( `Working directory of '${repository.name}' isn't clean. Local changes will be discarded, due to --force.` );
							log.debug( `Clearing working directory '${repository.name}'` );

							const git = new GitWrapper( repository.path );
							git.prefix( repository.name );

							return git.clean();
						}
					} );

				} else {
					let everythingClean = true;
					repos.forEach( repository => {
						if( !repository.isClean ) {
							log.error( `Working directory of '${repository.name}' isn't clean` );
							everythingClean = false;
						}
					} );
					if( !everythingClean ) {
						throw new errors.WorkingDirectoryNotCleanError();
					}
				}

				return repos;
			} );
	}

	update( repository ) {
		const git = new GitWrapper( repository.path );
		git.prefix( repository.name );

		let startingBranch = "";

		return git.status()
			.then( status => {
				startingBranch = status.current;

				if( status.current !== "master" && status.current !== "dev" ) {
					return this.pull( git, repository, status.current );
				}
			} )
			.then( () => this.pull( git, repository, "master" ) )
			.then( () => this.pull( git, repository, "dev" ) )
			.then( () => git.branchList() )
			.then( branchList => {
				if( this.config.targetBranch ) {
					if( this.config.targetBranch in branchList.branches === false ) {
						this.log.info( `'${this.config.targetBranch}' is not a valid branch in ${repository.name}.` );

					} else if( branchList.current !== startingBranch ) {
						return git.checkout( this.config.targetBranch );
					}
				}

				if( branchList.current !== startingBranch ) {
					log.debug( `Checking out '${repository.name}' → '${startingBranch}'` );

					return git.checkout( startingBranch );
				}
			} )
			.return( repository )
			.catch( errors.GitCheckoutNotFoundError, () => {
				this.log.info( `'${this.workingDirectory}' is not a git checkout. Skipping.` );
				return null;
			} );
	}

	pull( git, repository, branch ) {
		return git.branchList()
			.then( branchList => {
				const remoteBranch = `remotes/${this.config.targetRemote}/${branch}`;

				// Only skip if there is neither a local checkout of the branch nor does it exist remotely.
				// Consider that we might simply also not know about a remote branch because it was never fetched.
				if( !_.includes( branchList.all, branch ) && !_.includes( branchList.all, remoteBranch ) ) {
					log.info( `${repository.name} has no branch '${branch}'. Skipping update.` );
					return false;
				}

				if( branchList.current !== branch ) {
					// The branch we're currently on is not the one we want to update.

					if( _.includes( branchList.all, branch ) ) {
						// If the branch exist in the branch list, check it out.
						log.debug( `Checked out '${repository.name}' → '${branch}'` );

						return git.checkout( branch );

					} else if( _.includes( branchList.all, remoteBranch ) ) {
						// If the branch exist as a remote branch, check it out.
						log.debug( `Checked out '${repository.name}' → '${remoteBranch}' as '${branch}' (new branch)` );

						// Checkout will automatically check out the remote branch as a local branch with the same name.
						return git.checkout( branch );
					}
				}

				if( _.includes( branchList.all, branch ) && branchList.current !== branch ) {
					return git.checkout( branch );
				}

			} )
			.then( branchExists => {
				if( branchExists === false ) {
					return;
				}

				log.notice( `Updating '${repository.name}' in branch '${branch}'…` );
				return git.pull();
			} );
	}
}

function taskFactory( config ) {
	const task = new UpdateTask( config );
	return task.process();
}

module.exports = taskFactory;

