"use strict";

const Promise = require( "bluebird" );

const _                    = require( "lodash" );
const ConfigurationBuilder = require( "../config/builder" );
const errors               = require( "../errors" );
const fs                   = Promise.promisifyAll( require( "fs" ) );
const got                  = require( "got" );
const log                  = require( "fm-log" ).module();

class GitLabImporter {
	/**
	 * Constructs a new GitLabImporter.
	 * @param {String} group The group to import.
	 * @param {Object} options Additional options, usually parsed CLI arguments.
	 * @param {Boolean} [options.cloneHttps=false] Use HTTPS to access repositories.
	 * @param {String} [options.gitlab-host="gitlab.com"] The name of the server that is hosting the repositories.
	 */
	constructor( group, options ) {
		this.group   = group;
		this.options = options;
		this.host    = options[ "gitlab-host" ] || process.env.GITLAB_HOST || "gitlab.com";
	}

	check() {
		this.accessToken = process.env.GITLAB_ACCESS_TOKEN || this.options.token;

		if( !this.accessToken ) {
			return Promise.reject( new errors.MissingArgumentError( "GitLab API access token missing. Set GITLAB_ACCESS_TOKEN or use --token to provide it. Token needs 'api' scope." ) );
		}

		return Promise.resolve();
	}

	/**
	 * Initializes repositories based on the GitHubImporter GitLab instance.
	 * @returns {Promise.<*>}
	 */
	process() {
		log.notice( "Reading repositories from GitLab API…" );

		return Promise.resolve( got( `https://${this.host}/api/v4/groups/${this.group}/projects`, {
			headers : {
				"PRIVATE-TOKEN" : this.accessToken
			},
			query : {
				// eslint-disable-next-line camelcase
				per_page : 100
			},
			json : true
		} ) )
			.then( result => {
				log.info( `${result.body.length} projects in group.` );
				return result.body;
			} )
			.map( project => ( {
				name : project.name,
				url : this.options.https ? project.http_url_to_repo : project.ssh_url_to_repo,
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
						const findConfig = {
							name : repoConfig.name
						};
						if( !_.find( previousConfig.repositories, findConfig ) ) {
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

module.exports = GitLabImporter;
