"use strict";

const BaseTask   = require( "./_task" );
const GitWrapper = require( "./../git/git" );

class CleanTask extends BaseTask {
	// eslint-disable-next-line no-useless-constructor
	constructor( repository, config ) {
		super( repository, config );
	}

	process() {
		this.git = new GitWrapper( this.repoPath );
		this.git.prefix( this.repository.name );

		return this.git.clean();
	}
}

function taskFactory( folder ) {
	const task = new CleanTask( folder );
	return {
		title : "Cleaning…",
		task : () => task.process()
	};
}

module.exports = taskFactory;
