"use strict";

const BaseTask = require( "./_task" );

const GitWrapper = require( "./../git/git" );
const log        = require( "fm-log" ).module();

class CheckoutTask extends BaseTask {
	// eslint-disable-next-line no-useless-constructor
	constructor( repository, options ) {
		super( repository, options );
	}

	process() {
		return this.checkout();
	}

	checkout() {
		const git = new GitWrapper( this.repository.path );
		git.prefix( this.repository.name );
		return git.branchList()
			.then( branchList => {
				if( this.config.targetBranch ) {
					if( this.config.targetBranch in branchList.branches === false ) {
						log.info( `'${this.config.targetBranch}' is not a valid branch in ${this.repository.name}.` );

					} else if( branchList.current !== this.config.startingBranch ) {
						log.notice( `Checking out '${this.config.targetBranch}' in ${this.repository.name}…` );
						return git.checkout( this.config.targetBranch );
					}
				}
			} );
	}
}

function taskFactory( repository, options ) {
	const task = new CheckoutTask( repository, options );
	return task.process();
}

module.exports = taskFactory;

