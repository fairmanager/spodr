"use strict";

const PackageManagerTask = require( "./task.pm" );
const Promise            = require( "bluebird" );

const cliLog     = require( "../utils/cli-log" );
const execa      = require( "execa" );
const log        = require( "fm-log" ).module();
const path       = require( "path" );

class LinkDepTask extends PackageManagerTask {
	constructor( repository, options, linkModules ) {
		super( repository, options );
		this.linkModules = linkModules;
	}

	link( PackageManagerPath ) {
		if( this.repository.linkDep === true ) {
			log.notice( `Installing global dependencies into module '${this.repository.name}'` );
			const packageJson = require( path.join( this.repoPath, "package.json" ) );

			// For every provided "link module", check if we have a dependency on it.
			// If so, we're going to install it using "yarn link module".
			return Promise.each( this.linkModules, linkModule => {
				const currentDependencyVersion    = packageJson.dependencies && packageJson.dependencies[ linkModule.packageName ];
				const currentDevDependencyVersion = packageJson.devDependencies && packageJson.devDependencies[ linkModule.packageName ];

				if( !currentDependencyVersion && !currentDevDependencyVersion ) {
					return;
				}

				const parameters = [ "link", linkModule.packageName ];

				log.info( `Linking '${linkModule.packageName}' into '${this.repository.name}'` );
				cliLog( PackageManagerPath, parameters, this.repoPath, log );
				return execa( PackageManagerPath, parameters, {
					cwd : this.repoPath
				} )
					.catch( error => {
						log.error( error.stderr );
						throw error;
					} );
			} );

		} else {
			log.info( `Option 'linkDep' is not enabled for '${this.repository.name}'. Skipping.` );
			return Promise.resolve();
		}
	}
}

function taskFactory( repository, options, linkModules ) {
	const task = new LinkDepTask( repository, options, linkModules );
	return task.process( task.link );
}

module.exports = taskFactory;
