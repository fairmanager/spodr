"use strict";

const Promise = require( "bluebird" );

const chalk      = require( "chalk" );
const GitWrapper = require( "./../git/git" );
const Table      = require( "cli-table" );

class GitLastLogTask {
	constructor( repositories, options, settings ) {
		const self = this;

		self.repositories = repositories.filter( repo => repo.lastlog === undefined || repo.lastlog === true );
		self.options      = options;
		self.nameOnly     = settings.nameOnly;
		self.small        = settings.small;

		const tableOpts = {
			head : [
				chalk.cyan( self.nameOnly ? "Name" : "Directory" ),
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

		return Promise.each( self.repositories, self.getLastLog.bind( self ) )
			.then( () => {
				// eslint-disable-next-line no-console
				console.log( self.table.toString() );
			} );
	}

	getLastLog( repository ) {
		const self = this;

		const git = new GitWrapper( repository.path );
		git.prefix( repository.name );

		return git.gitLog( 1 )
			.then( gitLog => {
				const logEntry = gitLog.entries[ 0 ];
				let colorize   = chalk.red;

				// Bump commits should be green. They indicate a clean release.
				if( logEntry.header.match( /Bump version/ ) ) {
					colorize = chalk.green;
				}

				self.table.push( [
					colorize( self.nameOnly ? repository.name : repository.path ),
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

