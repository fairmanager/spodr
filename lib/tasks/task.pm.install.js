"use strict";

const PackageManagerTask = require( "./task.pm" );

const cliLog = require( "../utils/cli-log" );
const execa  = require( "execa" );
const log    = require( "fm-log" ).module();

class PackageManagerInstallTask extends PackageManagerTask {
	// eslint-disable-next-line no-useless-constructor
	constructor( repository, options ) {
		super( repository, options );
	}

	install( packageManagerPath ) {
		const parameters = [ "install" ];

		log.notice( `Installing node modules in '${this.repoPath}'…` );
		cliLog( packageManagerPath, parameters, this.repoPath, log );

		return execa( packageManagerPath, parameters, {
			cwd : this.repoPath
		} )
			.then( () => {
				log.info( `Installing node modules in '${this.repoPath}' done.` );
			} )
			.catch( error => {
				log.error( `Error while running '${this.config.packageManager} install' in '${this.repoPath}':` );
				log.error( error.stderr );
				log.warn( error );
				throw error;
			} );
	}
}

function taskFactory( repository, options ) {
	const task = new PackageManagerInstallTask( repository, options );
	return task.process( task.install );
}

module.exports = taskFactory;
