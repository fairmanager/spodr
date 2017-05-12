"use strict";

const BaseTask = require( "./_task" );
const Promise  = require( "bluebird" );

const _          = require( "lodash" );
const cliLog     = require( "../utils/cli-log" );
const errors     = require( "../errors" );
const execa      = require( "execa" );
const fs         = Promise.promisifyAll( require( "fs" ) );
const log        = require( "fm-log" ).module();
const path       = require( "path" );
const whichAsync = Promise.promisify( require( "which" ) );

class LinkDepTask extends BaseTask {
	constructor( repository, options, linkModules ) {
		super( repository, options );
		this.linkModules = linkModules;
	}

	process() {
		return this.getPackageJson()
			.bind( this )
			.then( this.getPackageManagerPath )
			.then( this.link )
			.catch( errors.PackageJsonNotFoundError, () => {
				log.info( `'${this.repository.name}' is not a NodeJS project. Skipping.` );
			} );
	}

	getPackageManagerPath() {
		return whichAsync( "yarn" )
			.catch( err => {
				throw new errors.PackageManagerNotFoundError();
			} );
	}

	getPackageJson() {
		return fs.statAsync( path.join( this.repoPath, "package.json" ) )
			.then( stats => {
				if( !stats.isFile() ) {
					throw new errors.PackageJsonNotFoundError( `No package.json present '${this.repoPath}'` );
				}
			} )
			.catch( {
				code : "ENOENT"
			}, err => {
				throw new errors.PackageJsonNotFoundError( `No package.json present '${this.repoPath}'` );
			} );
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
	return task.process();
}

module.exports = taskFactory;
