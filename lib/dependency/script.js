"use strict";

const Promise = require( "bluebird" );

const execa = require( "execa" );
const log   = require( "fm-log" ).module();

/**
 * Modules can declare scripts that need to be run during the installation process.
 * The `Script` class maintains data relating to this process.
 */
class Script {
	/**
	 * Construct a new `Script`.
	 * @param {String} versionTag The versioned package name that declared this script.
	 * @param {String} stage The stage at which this script should be run. For example "postinstall".
	 * @param {String} cwd The directory the script should be run in.
	 */
	constructor( versionTag, stage, cwd ) {
		this.versionTag = versionTag;
		this.stage      = stage;
		this.cwd        = cwd;
	}

	/**
	 * Run the script.
	 * @return {Promise<null>}
	 */
	process() {
		log.warn( `Processing '${this.stage}' script for '${this.versionTag}'…` );
		return Promise.resolve( execa.shell( `npm run ${this.stage}`, {
			cwd : this.cwd
		} ) )
			.return( null );
	}
}

module.exports = Script;
