"use strict";

const Promise = require( "bluebird" );

const _          = require( "lodash" );
const cliLog     = require( "../utils/cli-log" );
const errors     = require( "./../errors" );
const execa      = require( "execa" );
const whichAsync = Promise.promisify( require( "which" ) );

class GitWrapper {
	constructor( workingDirectory, options ) {
		this.workingDirectory = workingDirectory;
		this.options          = options;

		// Init logger
		this.prefix();
	}

	get git() {
		return whichAsync( "git" )
			.bind( this )
			.catch( () => {
				throw new errors.GitNotFoundError();
			} );
	}

	prefix( prefix ) {
		this.log = require( "fm-log" ).module( `git${( prefix ? `:${prefix}` : "" )}` );
	}

	clone( url, target, options ) {
		const parameters = _.union( [ "clone" ], options, [ url, target ] );
		return this.git
			.then( gitPath => {
				cliLog( gitPath, parameters, this.workingDirectory, this.log );
				return Promise.resolve( execa( gitPath, parameters, {
					cwd : this.workingDirectory
				} ) )
					.catch( error => {
						this.log.error( error.stderr );
					} );
			} );
	}

	checkout( branch, options ) {
		const parameters = _.union( [ "checkout" ], options, [ branch ] );
		return this.git
			.then( gitPath => {
				cliLog( gitPath, parameters, this.workingDirectory, this.log );
				return Promise.resolve( execa( gitPath, parameters, {
					cwd : this.workingDirectory
				} ) )
					.catch( error => {
						this.log.error( error.stderr );
					} );
			} );
	}

	branchList() {
		const parameters = [ "branch", "--all", "--verbose" ];
		return this.git
			.then( gitPath => {
				cliLog( gitPath, parameters, this.workingDirectory, this.log );
				return Promise.resolve( execa( gitPath, parameters, {
					cwd : this.workingDirectory
				} ) )
					.then( result => require( "./branchList" ).parse( result.stdout ) )
					.catch( error => {
						this.log.error( error.stderr );
					} );
			} );
	}

	status() {
		const parameters = [ "status", "--porcelain", "--branch" ];
		return this.git
			.then( gitPath => {
				cliLog( gitPath, parameters, this.workingDirectory, this.log );
				return Promise.resolve( execa( gitPath, parameters, {
					cwd : this.workingDirectory
				} ) )
					.then( result => require( "./status" ).parse( result.stdout ) )
					.then( status => status )
					.catch( error => {
						this.log.error( error.stderr );
					} );
			} );
	}

	stash( options ) {
		const parameters = _.union( [ "stash" ], options );
		return this.git
			.then( gitPath => {
				cliLog( gitPath, parameters, this.workingDirectory, this.log );
				return Promise.resolve( execa( gitPath, parameters, {
					cwd : this.workingDirectory
				} ) )
					.catch( error => {
						this.log.error( error.stderr );
					} );
			} );
	}

	pull() {
		const parameters = [ "pull", "--rebase" ];
		return this.git
			.bind( this )
			.then( gitPath => {
				cliLog( gitPath, parameters, this.workingDirectory, this.log );
				return Promise.resolve( execa( gitPath, parameters, {
					cwd : this.workingDirectory
				} ) )
					.catch( error => {
						this.log.error( error.stderr );
					} );
			} );
	}

	push() {
		const parameters = [ "push" ];
		return this.git
			.bind( this )
			.then( gitPath => {
				cliLog( gitPath, parameters, this.workingDirectory, this.log );
				return execa( gitPath, parameters, {
					cwd : this.workingDirectory
				} )
					.catch( error => {
						this.log.error( error.stderr );
					} );
			} );
	}

	clean() {
		const parameters = [ "checkout", "." ];
		return this.git
			.then( gitPath => {
				cliLog( gitPath, parameters, this.workingDirectory, this.log );
				return Promise.resolve( execa( gitPath, parameters, {
					cwd : this.workingDirectory
				} ) )
					.catch( error => {
						this.log.error( error.stderr );
					} )
					.return( gitPath );
			} )
			.then( gitPath => {
				const params = [ "clean", "--force", "-d" ];
				cliLog( gitPath, params, this.workingDirectory, this.log );
				return Promise.resolve( execa( gitPath, params, {
					cwd : this.workingDirectory
				} ) )
					.catch( error => {
						this.log.error( error.stderr );
					} );
			} );
	}

	fetchall() {
		const parameters = [ "fetch", "--all" ];
		return this.git
			.bind( this )
			.then( gitPath => {
				cliLog( gitPath, parameters, this.workingDirectory, this.log );
				return Promise.resolve( execa( gitPath, parameters, {
					cwd : this.workingDirectory
				} ) )
					.catch( error => {
						this.log.error( error.stderr );
					} );
			} );
	}
}

module.exports = GitWrapper;
