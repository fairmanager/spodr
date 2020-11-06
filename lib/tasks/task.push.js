"use strict";

const BaseTask   = require( "./_task" );
const GitWrapper = require( "./../git/git" );

class PushTask extends BaseTask {
	// eslint-disable-next-line no-useless-constructor
	constructor( repository, config ) {
		super( repository, config );
	}

	process() {
		this.git = new GitWrapper( this.repoPath );
		this.git.prefix( this.repository.name );

		if( this.repository.push === undefined || this.repository.push === true ) {
			return Promise.all( [
				this.git.push( this.config.targetRemote, this.config.targetBranch ),
				this.git.pushTags( this.config.targetRemote )
			] );

		} else {
			return null;
		}
	}
}

function taskFactory( folder, config ) {
	const task = new PushTask( folder, config );
	return task.process();
}

module.exports = taskFactory;
