"use strict";

const PackageManagerTask = require( "./task.pm" );
const Promise            = require( "bluebird" );

const cliLog     = require( "../utils/cli-log" );
const execa      = require( "execa" );
const log        = require( "fm-log" ).module();

class PackageManagerLinkTask extends PackageManagerTask {
	// eslint-disable-next-line no-useless-constructor
	constructor( repository, options ) {
		super( repository, options );
	}

	link( packageManagerPath ) {
		if( this.repository.link === true ) {
			log.notice( `Globally linking module '${this.repository.name}'` );
			cliLog( packageManagerPath, [ "link" ], this.repoPath, log );
			return execa( packageManagerPath, [ "link" ], {
				cwd : this.repoPath
			} )
				.catch( error => {
					log.error( error.stderr );
					throw error;
				} );

		} else {
			log.info( `Option 'link' is not enabled for '${this.repository.name}'. Skipping.` );
			return Promise.resolve();
		}
	}
}

function taskFactory( repository, options ) {
	const task = new PackageManagerLinkTask( repository, options );
	return task.process( task.link );
}

module.exports = taskFactory;
