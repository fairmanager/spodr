"use strict";

const Promise = require( "bluebird" );

const _             = require( "lodash" );
const Configuration = require( "./configuration" );
const fs            = Promise.promisifyAll( require( "fs" ) );
const path          = require( "path" );
const Repository    = require( "./repository" );

class ConfigurationBuilder {
	/**
	 * @returns {string} The name of the spodr configuration file.
	 */
	static get CONFIG_FILENAME() {
		return ".spodr.json";
	}

	/**
	 * @returns {string} The name of the spodr RC file.
	 */
	static get RC_FILENAME() {
		return ".spodrrc";
	}

	/**
	 * Construct a new ConfigurationBuilder.
	 * @param {String} [root=process.cwd()] The directory from where to build the configuration.
	 * @param {Array} [argv=process.argv] The command line arguments to merge into the configuration.
	 */
	constructor( root = process.cwd(), argv = process.argv ) {
		this.root = root;
		this.argv = argv;
		this.log  = require( "fm-log" ).module( "configuration" );
	}

	/**
	 * Provide a configuration based on the CLI arguments only.
	 * @returns {Promise.<Configuration>}
	 */
	cli() {
		const configuration = new Configuration();

		return ConfigurationBuilder.mergeCliArgs( configuration, this.argv );
	}

	/**
	 * Build a Configuration instance.
	 * @returns {Promise<Configuration>}
	 */
	build() {
		const configuration = new Configuration();

		// Begin by merging the CLI arguments.
		// We need to parse these first, as they might have flags that already affect
		// further parsing (like being verbose).
		return ConfigurationBuilder.mergeCliArgs( configuration, this.argv )
			// Then start constructing repository-only information from the contents
			// of the current working directory.
			.then( () => this.mergeDirectories( configuration, this.root ) )
			// Then merge in possible repository-specific RC files.
			.then( () => this.mergeRcFiles( configuration, this.root ) )
			// Then merge the local configuration file, allowing the user to override
			// anything set before.
			.then( () => {
				const configurationFile = path.join( this.root, ConfigurationBuilder.CONFIG_FILENAME );
				ConfigurationBuilder.mergeConfigurationFile( configuration, configurationFile );

				return configuration;
			} );
	}

	/**
	 * Merges a set of repositories into another set of repositories.
	 * @param {Array<Repository>} from The array of projects that should be merged.
	 * @param {Array<Repository>} to The array the projects will be merged into.
	 * @returns {Array<Repository>}
	 */
	static mergeRepositories( from, to ) {
		_.forEach( from, repository => {
			// Append new configurations to the set.
			const existingRepositoryConfiguration = _.find( to, {
				name : repository.name
			} );
			if( !existingRepositoryConfiguration ) {
				to.push( repository );
				return;
			}

			// Merge existing configurations
			_.merge( existingRepositoryConfiguration, repository );
		} );

		return to;
	}

	/**
	 * A set of directory names in the given root directory.
	 * @param {String} root
	 * @returns {Promise<Array<String>>}
	 */
	static getDirectories( root ) {
		return fs.readdirAsync( root )
			.map( entry => Promise.join( entry, fs.statAsync( entry ), ( Entry, stat ) => ( {
				file : Entry,
				stat : stat
			} ) ) )
			.filter( entry => entry.stat.isDirectory() )
			.map( directory => directory.file );
	}

	/**
	 * Constructs a configuration from information obtained by a directory structure.
	 * @param {Configuration} configuration
	 * @param {String} root The path from where to construct the information.
	 * @returns {Promise<Configuration>}
	 */
	mergeDirectories( configuration, root ) {
		return ConfigurationBuilder.getDirectories( root )
			.map( directory => {
				const repository = new Repository( directory );
				return fs.statAsync( path.join( directory, "package.json" ) )
					.then( () => {
						repository.link    = true;
						repository.linkDep = true;
					} )
					.catch( () => {
						repository.link    = false;
						repository.linkDep = false;
					} )
					.return( repository );
			} )
			.then( repositories => {
				ConfigurationBuilder.mergeRepositories( repositories, configuration.repositories );
				return configuration;
			} );
	}

	/**
	 * Merges settings from a configuration file into the configuration.
	 * @param {Configuration} configuration
	 * @param {String} file The path of the configuration file.
	 * @returns {Configuration} The configuration that was passed into the method.
	 */
	static mergeConfigurationFile( configuration, file ) {
		try {
			const configurationFile = require( file );

			ConfigurationBuilder.mergeRepositories( configurationFile.repositories, configuration.repositories );

			if( typeof configurationFile.parallelExecutions !== "undefined" ) {
				configuration.parallelExecutions = configurationFile.parallelExecutions;
			}

		} catch( error ) {
			if( error.code !== "MODULE_NOT_FOUND" ) {
				throw error;
			}
			return configuration;
		}

		return configuration;
	}

	/**
	 * Merges RC files from project directories.
	 * @param {Configuration} configuration
	 * @param {String} root
	 * @returns {Promise<Configuration>}
	 */
	mergeRcFiles( configuration, root ) {
		return ConfigurationBuilder.getDirectories( root )
			.map( directory => {
				try {
					const rcPath = path.join( root, directory, ConfigurationBuilder.RC_FILENAME );
					const rcFile = require( rcPath );

					// Don't allow RC file to override settings from other projects.
					rcFile.name = directory;

					this.log.info( `Merged '${rcPath}'.` );

					return ConfigurationBuilder.mergeRepositories( [ rcFile ], configuration.repositories );

				} catch( error ) {
					if( error.code !== "MODULE_NOT_FOUND" ) {
						throw error;
					}
					return configuration;
				}
			} )
			.return( configuration );
	}

	/**
	 * Merge command line arguments into the configuration.
	 * @param {Configuration} configuration
	 * @param {Array<String>} argv The command line arguments.
	 * @returns {Promise<Configuration>}
	 */
	static mergeCliArgs( configuration, argv ) {
		return Promise.resolve( ( function iife() {
			const args = require( "minimist" )( argv.slice( 2 ) );

			if( args.jobs || args.j ) {
				configuration.parallelExecutions = args.jobs || args.j || configuration.parallelExecutions;
			}

			if( args.force || args.f ) {
				configuration.force = true;
			}

			if( args.verbose || args.v ) {
				configuration.verbose = true;
			}

			return configuration;
		} )() );
	}
}

module.exports = ConfigurationBuilder;
