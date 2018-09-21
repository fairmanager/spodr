"use strict";

const GitWrapper = require( "./../git/git" );
const Promise    = require( "bluebird" );
const Table      = require( "cli-table" );

const chalk = require( "chalk" );
const log   = require( "fm-log" ).module();

class GitStatusTask {
	constructor( repositories, options, settings ) {
		const self = this;

		self.repositories = repositories.filter( repo => repo.status === undefined || repo.status === true );
		self.options      = options;
		self.fetchRepos   = settings.fetch;
		self.nameOnly     = settings.nameOnly;
		self.small        = settings.small;

		const tableOpts = {
			head : [
				chalk.cyan( self.nameOnly ? "Name" : "Directory" ),
				chalk.cyan( "Branch" ),
				chalk.cyan( self.small ? "A" : "Ahead" ),
				chalk.cyan( self.small ? "B" : "Behind" ),
				chalk.cyan( self.small ? "N" : "Not added" ),
				chalk.cyan( self.small ? "D" : "Deleted" ),
				chalk.cyan( self.small ? "M" : "Modified" ),
				chalk.cyan( self.small ? "C" : "Created" )
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

		return Promise.map( self.repositories, self.getStatus.bind( self ), {
			concurrency : self.options.parallelExecutions
		} )
			.each( repository => {
				let colorize = chalk.green;

				if( repository.__status.ahead || repository.__status.behind ) {
					colorize = chalk.yellow;
				}
				if( repository.__status.notAdded.length || repository.__status.deleted.length || repository.__status.modified.length || repository.__status.created.length ) {
					colorize = chalk.red;
				}

				self.table.push( [
					colorize( self.nameOnly ? repository.name : repository.path ),
					colorize( repository.__status.current ),
					colorize( repository.__status.ahead ),
					colorize( repository.__status.behind ),
					colorize( repository.__status.notAdded.length ),
					colorize( repository.__status.deleted.length ),
					colorize( repository.__status.modified.length ),
					colorize( repository.__status.created.length )
				] );
			} )
			// eslint-disable-next-line no-console
			.then( () => console.log( self.table.toString() ) );
	}

	getStatus( repository ) {
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
			.then( () => git.status() )
			.then( status => {
				repository.__status = status;
				return repository;
			} );
	}
}

function taskFactory( repositories, options, fetchRepos ) {
	const task = new GitStatusTask( repositories, options, fetchRepos );
	return task.process();
}

module.exports = taskFactory;

