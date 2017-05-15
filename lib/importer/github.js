"use strict";

const Promise = require( "bluebird" );

const _                    = require( "lodash" );
const ConfigurationBuilder = require( "../config/builder" );
const errors               = require( "../errors" );
const fs                   = Promise.promisifyAll( require( "fs" ) );
const got                  = require( "got" );
const log                  = require( "fm-log" ).module();
const os                   = require( "os" );
const path                 = require( "path" );

class GitHubImporter {
	/**
	 * Constructs a new GitHubImporter.
	 * @param {String} organization The organization to import.
	 * @param {Object} options Additional options, usually parsed CLI arguments.
	 * @param {Boolean} [options.cloneHttps=false] Use HTTPS to access repositories.
	 */
	constructor( organization, options ) {
		this.organization = organization;
		this.options      = options;
	}

	check() {
		this.accessToken = process.env.GITHUB_ACCESS_TOKEN || this.options.token;

		if( !this.accessToken ) {
			return Promise.reject( new errors.MissingArgumentError( "GitHub API access token missing. Set GITHUB_ACCESS_TOKEN or use --token to provide it." ) );
		}

		return Promise.resolve();
	}

	/**
	 * Initializes repositories based on a GitHub organization.
	 * @returns {Promise.<*>}
	 */
	process() {
		log.notice( "Reading repositories from GitHub API…" );

		return Promise.resolve( got( `https://api.github.com/orgs/${this.organization}/repos`, {
			headers : {
				Authorization : `token ${this.accessToken}`
			},
			query : {
				per_page : 100 // eslint-disable-line camelcase
			},
			json : true
		} ) )
			.then( result => {
				log.info( `${result.body.length} projects in group.` );
				return result.body;
			} )
			.map( project => ( {
				name    : project.name,
				url     : this.options.https ? project.clone_url : project.ssh_url,
				linkDep : true
			} ) )
			.then( repositories => [
				{
					repositories : repositories
				},
				fs.readFileAsync( ConfigurationBuilder.CONFIG_FILENAME, "utf-8" )
						.then( JSON.parse )
						.catchReturn( {
							code : "ENOENT"
						}, null )
						.catch( error => {
							log.warn( `Existing '${ConfigurationBuilder.CONFIG_FILENAME}' unreadable!` );
							throw error;
						} )
			] )
			.spread( ( config, previousConfig ) => {
				if( previousConfig ) {
					log.info( "Spodr configuration found. Merging…" );
					_.forEach( config.repositories, repoConfig => {
						if( !_.find( previousConfig.repositories, {
							name : repoConfig.name
						} ) ) {
							previousConfig.repositories.push( repoConfig );
							log.notice( `Added new repository '${repoConfig.name}'.` );
						}
					} );
					config = previousConfig;
				}

				return config;
			} );
	}
}

module.exports = GitHubImporter;
