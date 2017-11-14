"use strict";

const GitWrapper = require( "./../git/git" );
const Promise    = require( "bluebird" );
const Table      = require( "cli-table" );

const chalk = require( "chalk" );
const log   = require( "fm-log" ).module();

class GitLastLogTask {
	constructor( repositories, options, settings ) {
		const self = this;

		self.repositories = repositories;
		self.options      = options;
		self.fetchRepos   = settings.fetch;
		self.nameOnly     = settings.nameOnly;
		self.small        = settings.small;

		const tableOpts = {
			head : [
				chalk.cyan( self.nameOnly ? "Directory" : "Name" ),
				chalk.cyan( "Log" ),
				chalk.cyan( "When" )
			],
			chars : {
				// eslint-disable-next-line quote-props
				"mid" : "",
				"left-mid" : "",
				"mid-mid" : "",
				"right-mid" : ""
			}
		};
		self.table = new Table( tableOpts );
	}

	process() {
		const self = this;

		return Promise.map( self.repositories, self.getLastLog.bind( self ), {
			concurrency : self.options.parallelExecutions
		} )
			.then( () => {
				// eslint-disable-next-line no-console
				console.log( self.table.toString() );
			} );
	}

	getLastLog( repository ) {
		const self = this;

		const git = new GitWrapper( repository.path );
		git.prefix( repository.name );

		let fetchPromise = null;

		if( self.fetchRepos ) {
			fetchPromise = git.fetchall().catch( log.error );
		} else {
			fetchPromise = Promise.resolve();
		}

		return fetchPromise
			.then( () => git.gitLog( 1 ) )
			.then( gitLog => {
				const logEntry = gitLog.entries[ 0 ];
				let colorize   = chalk.red;

				// Merge commits should be green. We want to highlight commits not merged into master yet.
				if( 1 < logEntry.parents.length ) {
					colorize = chalk.green;
				}

				self.table.push( [
					colorize( self.nameOnly ? repository.path : repository.path ),
					colorize( logEntry.header ),
					colorize( logEntry.date.relative )
				] );
			} );
	}
}

function taskFactory( repositories, options, fetchRepos ) {
	const task = new GitLastLogTask( repositories, options, fetchRepos );
	return task.process();
}

module.exports = taskFactory;

