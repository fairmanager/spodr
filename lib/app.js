"use strict";

const Promise = require( "bluebird" );

const _                    = require( "lodash" );
const argv                 = require( "minimist" )( process.argv.slice( 2 ) );
const attemptRequire       = require( "attempt-require" );
const ConfigurationBuilder = require( "./config/builder" );
const errors               = require( "./errors" );
const fs                   = require( "fs" );
const log                  = require( "fm-log" ).module();
const path                 = require( "path" );
const tasks                = require( "./tasks" );
const help                 = require( "./help" );

class Application {
	boot() {
		return Promise.resolve( Application.determineTask() )
			.then( task => {
				this.task = task;

				return new ConfigurationBuilder().cli()
					.then( configuration => {
						this.config = configuration;

						if( !configuration.verbose ) {
							require( "fm-log" ).logFactory.require( require( "fm-log" ).LogLevels.INFO );
						}

						// Tasks that require no configuration cause instantly bail out.
						if( task === "init" ) {
							return;
						}

						// Build configuration for current location.
						return new ConfigurationBuilder().build()
							.bind( this )
							.then( config => {
								this.config = config;
							} )
							.then( () => this.prepareRepositories() )
							.then( repositories => {
								this.repositories = repositories;
							} );
					} );
			} );
	}

	static determineTask() {
		if( process.argv[ 2 ] === "help" ) {
			help.main();
			process.exit();
		}

		if( process.argv[ 3 ] === "help" ) {
			help.getHelp( process.argv[ 2 ] );
			process.exit();
		}

		if( process.argv[ 2 ] === "man" ) {
			help.spodrman();
			process.exit();
		}

		return process.argv[ 2 ];
	}

	start() {
		switch( this.task ) {
			case "init":
				this.init();
				break;

			case "check":
				this.check();
				break;

			case "clean":
				this.clean();
				break;

			case "create":
				this.create();
				break;

			case "update":
				this.update();
				break;

			case "push":
				this.push();
				break;

			case "lastlog":
				this.lastlog();
				break;

			case "peek":
				this.peek();
				break;

			case "status":
				this.status();
				break;

			case "unartifact":
				this.unartifact();
				break;

			default:
				// eslint-disable-next-line no-console
				console.log( `The command '${process.argv[ 2 ]}' was not understood. Try 'spodr help' to get a list of possible options.` );
		}
	}

	init() {
		if( !argv.github && !argv.gitlab ) {
			throw new errors.MissingArgumentError( "Missing importer. Specify either --github or --gitlab" );
		}

		// Construct importer.
		const Importer = require( "./importer" );

		let importer = null;
		if( argv.github ) {
			importer = new Importer.GitHub( argv.github, argv );
		} else if( argv.gitlab ) {
			importer = new Importer.GitLab( argv.gitlab, argv );
		}

		return importer.check()
			.catch( errors.MissingArgumentError, error => {
				log.error( error.message );
				process.exit( 1 );
			} )
			.then( () => importer.process() )
			.then( configuration => {
				this.repositories = configuration.repositories;
			} )
			.then( () => this.create() );
	}

	create() {
		if( !this.repositories || !this.repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( this.repositories );
		}

		return Promise.map( this.repositories, repository => tasks.create( repository, this.config ), {
			concurrency : this.config.parallelExecutions
		} )
			.bind( this )
			.filter( Boolean )
			.then( result => {
				log.notice( `${result.length} repositories created.` );
				return result;
			} )
			.then( () => this.finish() )
			.catch( err => {
				log.error( err );
			} );
	}

	check() {
		if( !this.repositories || !this.repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( this.repositories );
		}

		log.info( "Checking working directories…" );
		log.debug( `${this.repositories.length} repositories to check.` );

		return Promise.map( this.repositories, repository => tasks.check( repository, this.config ), {
			concurrency : this.config.parallelExecutions
		} )
			.then( () => this.finish() )
			.catch( err => {
				log.error( err );
			} );
	}

	clean() {
		if( !this.repositories || !this.repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( this.repositories );
		}

		log.info( "Cleaning working directories…" );
		log.debug( `${this.repositories.length} repositories to clean.` );

		return Promise.map( this.repositories, repository => tasks.clean( repository, this.config ), {
			concurrency : this.config.parallelExecutions
		} )
			.then( () => this.finish() )
			.catch( err => {
				log.error( err );
			} );
	}

	lastlog() {
		if( !this.repositories || !this.repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( this.repositories );
		}

		log.info( "Generating Table…" );

		return tasks.gitLastLog( this.repositories, this.config, {
			fetch : false,
			nameOnly : argv[ "name-only" ] || argv.min,
			small : argv.small || argv.min
		} )
			.then( () => this.finish() )
			.catch( err => {
				log.error( err );
			} );
	}

	peek() {
		if( !this.repositories || !this.repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( this.repositories );
		}

		log.info( "Generating Table…" );

		return tasks.gitStatus( this.repositories, this.config, {
			fetch : false,
			nameOnly : argv[ "name-only" ] || argv.min,
			small : argv.small || argv.min
		} )
			.then( () => this.finish() )
			.catch( err => {
				log.error( err );
			} );
	}

	status() {
		if( !this.repositories || !this.repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( this.repositories );
		}

		log.info( "Generating Table…" );

		return tasks.gitStatus( this.repositories, this.config, {
			fetch : !argv[ "skip-git" ],
			nameOnly : argv[ "name-only" ] || argv.min,
			small : argv.small || argv.min
		} )
			.then( () => this.finish() )
			.catch( err => {
				log.error( err );
			} );
	}

	unartifact() {
		if( !this.repositories || !this.repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( this.repositories );
		}

		log.info( "Searching for artifacts…" );

		return tasks.unartifact( this.repositories )
			.then( () => this.finish() )
			.catch( err => {
				log.error( err );
			} );
	}

	update() {
		let updatePromise = null;

		// Skip updating the git repository if the user explicitly asked for it or if any
		// of the sub tasks have been requested.
		const skipGitUpdate = argv[ "skip-git" ] || argv.link || argv.linkdep || argv.deps;

		// By default, we git pull all relevant branches, unless invoked with --skip-git.
		if( skipGitUpdate ) {
			updatePromise = Promise.resolve( this.repositories );
		} else {
			updatePromise = tasks.update( this.config );
		}

		// The git update task will return an update repository configuration list.
		// This list has the global configuration merged with .syncrc files from the repositories themselves.

		if( argv.link ) {
			updatePromise = updatePromise
				.then( repositories => this.pmLink( repositories )
					.return( repositories ) );
		}

		if( argv.linkdep ) {
			updatePromise = updatePromise
				.then( repositories => this.linkdep( repositories )
					.return( repositories ) );
		}

		if( argv.deps ) {
			updatePromise = updatePromise
				.then( repositories => this.pmInstall( repositories )
					.return( repositories ) );
		}

		return updatePromise
			.then( this.finish.bind( this ) )
			.catch( errors.WorkingDirectoryNotCleanError, error => {
				log.error( "Dirty working directories detected. Aborting. Use --force to discard local changes and update anyway." );
				process.exit( 1 );
			} );
	}

	/**
	 * Run "npm install" in a set of repositories.
	 * @param {Array} [repositories] The repositories to run "npm install" in. By default, all project directories are used.
	 * @returns {Promise.<TResult>}
	 */
	pmInstall( repositories ) {
		if( !repositories || !repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( repositories );
		}

		if( this.config.parallelExecutions > 1 ) {
			log.warn( "Concurrency is set above 1. This can cause issues with package manager caches. Run with -j1 to disable concurrency for this command." );
		}

		return Promise.map( repositories, repository => tasks.pmInstall( repository, this.config ), {
			concurrency : this.config.parallelExecutions
		} )
			.then( () => log.notice( `node modules updated.` ) )
			.catch( err => {
				log.error( err.message );
				log.debug( err );
			} )
			.return( repositories );
	}

	/**
	 * Run "npm link" in a set of repositories.
	 * @param {Array} [repositories] The repositories to run "npm link" in. By default, all project directories are used.
	 * @returns {Promise.<TResult>}
	 */
	pmLink( repositories ) {
		if( !repositories || !repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( repositories );
		}

		if( this.config.parallelExecutions > 1 ) {
			log.info( "Concurrency is set above 1. This can cause issues due to excessive I/O on certain systems. Run with -j1 to disable concurrency for this command." );
		}

		return Promise.map( repositories, repository => tasks.pmLink( repository, this.config ), {
			concurrency : this.config.parallelExecutions
		} )
			.then( () => log.notice( `node modules globally linked.` ) )
			.catch( err => {
				log.error( err.message );
				log.debug( err );
			} )
			.return( repositories );
	}

	linkdep( repositories ) {
		if( !repositories || !repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( repositories );
		}

		// Linkdep is a pretty safe operation, even with high parallelism. No warning has to be issued here.

		return Promise.map( repositories, repository => tasks.linkdep( repository, this.config, this.repositories ), {
			concurrency : this.config.parallelExecutions
		} )
			.then( () => log.notice( `node dependencies linked.` ) )
			.catch( err => {
				log.error( err.message );
				log.debug( err );
			} )
			.return( repositories );
	}

	push() {
		if( !this.repositories || !this.repositories.length ) {
			log.notice( "No repositories found. Nothing to do." );
			return Promise.resolve( this.repositories );
		}

		return Promise.map( this.repositories, repository => tasks.push( repository, this.config ), {
			concurrency : this.config.parallelExecutions
		} )
			.bind( this )
			.filter( Boolean )
			.then( result => {
				log.notice( `${result.length} repositories pushed.` );
				return result;
			} )
			.then( () => this.finish() )
			.catch( err => {
				log.error( err );
			} );
	}

	prepareRepositories() {
		const repositories = _.clone( this.config.repositories );
		repositories.map( repo => {
			if( repo.sortBelow && repo.sortAbove ) {
				throw new Error( "Can't use both 'sortBelow' and 'sortAbove'." );
			}
			return repo;
		} );

		repositories.forEach( ( repo, index ) => repo.__orderIndex = index * 10 );

		const updateIndices = () => repositories.some( repo => {
			const getSortKey = element => element.sortAbove || element.sortBelow || element.name;
			// eslint-disable-next-line no-nested-ternary
			const getSortOffset = element => element.sortAbove ? -1 : element.sortBelow ? 1 : 0;
			const origin        = this.config.repositories.find( repository => repository.name === getSortKey( repo ) );
			const newIndex      = origin.__orderIndex + getSortOffset( repo );
			if( newIndex === repo.__orderIndex ) {
				return false;
			}

			repo.__orderIndex = newIndex;
			return true;
		} );

		for( let attemps = 0; updateIndices(); ++attemps ) {
			if( attemps > 10 ) {
				throw new Error( "Unable to determine stable sort order." );
			}
		}

		repositories.sort( ( a, b ) => a.__orderIndex - b.__orderIndex );
		repositories.forEach( repo => {
			delete repo.__orderIndex;
		} );

		if( !repositories ) {
			return Promise.resolve( repositories );
		}

		function init( repository ) {
			repository.path = path.join( repository.target || process.cwd(), repository.name );

			const packageJson = attemptRequire( path.join( repository.path, "package.json" ) );

			if( packageJson ) {
				repository.packageName = packageJson.name;
			}

			return repository;
		}

		return Promise.map( repositories, repository => init( repository ) )
			.filter( repository => {
				if( !fs.existsSync( path.join( repository.path, ".git" ) ) ) {
					return false;
				}

				return !repository.name.startsWith( "." );
			} );
	}

	finish() {
		log.notice( `Operation finished` );
		process.exit();
	}
}

module.exports = new Application();
