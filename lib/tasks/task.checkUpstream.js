"use strict";

const GitWrapper = require( "./../git/git" );
const Promise    = require( "bluebird" );
const Table      = require( "cli-table" );

const chalk  = require( "chalk" );
const errors = require( "../errors" );
const log    = require( "fm-log" ).module();

class CheckUpstreamTask {
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
				chalk.cyan( "Branch" ),
				chalk.cyan( self.small ? "B" : "Behind" ),
				chalk.cyan( self.small ? "LC" : "Last commit on upstream" )
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
			.then( () => git.branchList() )
			.then( branchList => {
				const hasUpstream = branchList.all.some( branchName => branchName.indexOf( "upstream" ) !== -1 );
				if( !hasUpstream ) {
					throw new errors.NoUpstreamError();
				}
				return branchList.all.filter( branchName => {
					if( branchName.indexOf( "remotes" ) !== -1 ) {
						return false;
					}
					const upstreamBranch = `remotes/upstream/${branchName}`;
					return branchList.all.find( branch => branch === upstreamBranch );
				} );
			} )
			.then( localBranchens => Promise.map( localBranchens, branch => git.checkUpstream( branch ) ) )
			.then( result => {
				result.forEach( ( branch, index ) => {
					const branchName = branch[ 0 ];
					const commits    = branch[ 1 ];

					let colorize = chalk.green;

					if( commits && 0 < commits.length ) {
						colorize = chalk.red;
					}

					let name = " -> ";
					if( index === 0 ) {
						name = self.nameOnly ? repository.path : repository.path;
					}

					self.table.push( [
						colorize( name ),
						colorize( branchName ),
						colorize( commits.length ),
						colorize( commits.length ? commits[ 0 ] : "" )
					] );
				} );
			} )
			.catch( errors.NoUpstreamError, Function.prototype );
	}
}

function taskFactory( repositories, options, fetchRepos ) {
	const task = new CheckUpstreamTask( repositories, options, fetchRepos );
	return task.process();
}

module.exports = taskFactory;

