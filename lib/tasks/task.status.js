"use strict";

const GitWrapper = require( "./../git/git" );


const path   = require( "path" );

class StatusTask {
	constructor( folder ) {
		this.folder   = folder;
		this.repoPath = path.join( process.cwd(), folder );
	}

	process() {
		const git = new GitWrapper( this.repoPath );
		git.prefix( repository.name ); // eslint-disable-line no-undef

		return this.git.status()
			.then( status => ( {
				name    : this.folder,
				isClean : status.isClean()
			} ) );
	}
}

function taskFactory( folder ) {
	const task = new StatusTask( folder );
	return task.process();
}

module.exports = taskFactory;
