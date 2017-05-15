"use strict";

const BaseTask   = require( "./_task" );
const GitWrapper = require( "./../git/git" );
const Promise    = require( "bluebird" );

class PushTask extends BaseTask {
	// eslint-disable-next-line no-useless-constructor
	constructor( repository, config ) {
		super( repository, config );
	}

	process() {
		this.git = new GitWrapper( this.repoPath );
		this.git.prefix( this.repository.name );

		return this.git.push();
	}
}

function taskFactory( folder ) {
	const task = new PushTask( folder );
	return task.process();
}

module.exports = taskFactory;
