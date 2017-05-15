"use strict";

const GitWrapper = require( "./../git/git" );
const Promise    = require( "bluebird" );

const _      = require( "lodash" );
const errors = require( "../errors" );
const log    = require( "fm-log" ).module();
const path   = require( "path" );

class StatusTask {
	constructor( folder ) {
		this.folder   = folder;
		this.repoPath = path.join( process.cwd(), folder );
	}

	process() {
		const git = new GitWrapper( this.repoPath );
		git.prefix( repository.name );

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
