"use strict";

const GitWrapper = require( "./../git/git" );
const Promise    = require( "bluebird" );
const Table      = require( "cli-table" );

const chalk  = require( "chalk" );
const log    = require( "fm-log" ).module();

class GitStatusTask {
	constructor( repositories, options, fetchRepos ) {
		const self = this;

		self.repositories = repositories;
		self.options = options;
		self.fetchRepos = fetchRepos;

		const tableOpts = {
			head : [
				chalk.cyan( "Directory" ),
				chalk.cyan( "Branch" ),
				chalk.cyan( "Ahead" ),
				chalk.cyan( "Behind" ),
				chalk.cyan( "Not added" ),
				chalk.cyan( "Deleted" ),
				chalk.cyan( "Modified" ),
				chalk.cyan( "Created" )
			],
			chars : {
				 // eslint-disable-next-line quote-props
				"mid"       : "",
				"left-mid"  : "",
				"mid-mid"   : "",
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
			.then( () => {
				// eslint-disable-next-line no-console
				console.log( self.table.toString() );
			} );
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
				let colorize = chalk.green;

				if( status.ahead || status.behind ) {
					colorize = chalk.yellow;
				}
				if( status.notAdded.length || status.deleted.length || status.modified.length || status.created.length ) {
					colorize = chalk.red;
				}

				self.table.push( [
					colorize( repository.path ),
					colorize( status.current ),
					colorize( status.ahead ),
					colorize( status.behind ),
					colorize( status.notAdded.length ),
					colorize( status.deleted.length ),
					colorize( status.modified.length ),
					colorize( status.created.length )
				] );
			} );
	}
}

function taskFactory( repositories, options, fetchRepos ) {
	const task = new GitStatusTask( repositories, options, fetchRepos );
	return task.process();
}

module.exports = taskFactory;

