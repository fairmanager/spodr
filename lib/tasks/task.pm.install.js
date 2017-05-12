"use strict";

const BaseTask           = require( "./_task" );
const PackageManagerTask = require( "./task.pm" );
const Promise            = require( "bluebird" );

const _          = require( "lodash" );
const cliLog     = require( "../utils/cli-log" );
const errors     = require( "../errors" );
const execa      = require( "execa" );
const fs         = Promise.promisifyAll( require( "fs" ) );
const log        = require( "fm-log" ).module();
const path       = require( "path" );
const whichAsync = Promise.promisify( require( "which" ) );

class PackageManagerInstallTask extends PackageManagerTask {
	constructor( repository, options ) {
		super( repository, options );
	}

	install( packageManagerPath ) {
		const parameters = [ "install", "--silent" ];

		log.notice( `Installing node modules in '${this.repoPath}'` );
		cliLog( packageManagerPath, parameters, this.repoPath, log );

		return execa( packageManagerPath, parameters, {
			cwd    : this.repoPath
		} )
			.catch( error => {
				log.error( `Error while running 'yarn install' in '${this.repoPath}':` );
				log.error( error.stderr );
				log.warn( error );
				throw error;
			} );
	}
}

function taskFactory( repository, options ) {
	const task = new PackageManagerInstallTask( repository, options );
	return task.process(task.install());
}

module.exports = taskFactory;
