"use strict";

const GitWrapper = require( "./../git/git" );
const BaseTask   = require( "./_task" );
const Promise    = require( "bluebird" );
const Table      = require( "cli-table" );

const _      = require( "lodash" );
const chalk  = require( "chalk" );
const errors = require( "../errors" );
const fs     = Promise.promisifyAll( require( "fs" ) );
const log    = require( "fm-log" ).module();
const path   = require( "path" );
const utils  = require( "./utils" );

class GitStatusTask {
	constructor( repositories, options, fetchRepos ) {
		const self = this;

		self.repositories = repositories;
		self.options = options;
		self.fetchRepos = fetchRepos;

		let tableOpts = {
			head : [
				chalk.cyan( "Directory" ),
				chalk.cyan( "Branch"    ),
				chalk.cyan( "Ahead"     ),
				chalk.cyan( "Behind"    ),
				chalk.cyan( "Not added" ),
				chalk.cyan( "Deleted"   ),
				chalk.cyan( "Modified"  ),
				chalk.cyan( "Created"   )
			],
			chars: {
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
				console.log( self.table.toString() );
			} );
	}

	getStatus( repository ) {
		const self = this;

		const git = new GitWrapper( repository.path );
		git.prefix( repository.name );

		let fetchPromise;

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

