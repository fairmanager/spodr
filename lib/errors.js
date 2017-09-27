"use strict";

class SpodrError extends Error {
	constructor( message ) {
		super( message );
		this.name    = this.constructor.name;
		this.message = message || "An error occurred.";
		Error.captureStackTrace( this, SpodrError );
	}
}

class DirectoryExistsError extends SpodrError {
	constructor( message ) {
		super( message );
		Error.captureStackTrace( this, DirectoryExistsError );
	}
}

class DirectoryNotExistsError extends SpodrError {
	constructor( message ) {
		super( message );
		Error.captureStackTrace( this, DirectoryNotExistsError );
	}
}

class WorkingDirectoryNotCleanError extends SpodrError {
	constructor( message ) {
		super( message );
		Error.captureStackTrace( this, WorkingDirectoryNotCleanError );
	}
}

class PackageManagerNotFoundError extends SpodrError {
	constructor( message ) {
		super( message );
		Error.captureStackTrace( this, PackageManagerNotFoundError );
	}
}

class GitNotFoundError extends SpodrError {
	constructor( message ) {
		super( message );
		Error.captureStackTrace( this, GitNotFoundError );
	}
}

class PackageJsonNotFoundError extends SpodrError {
	constructor( message ) {
		super( message );
		Error.captureStackTrace( this, PackageJsonNotFoundError );
	}
}

class MissingArgumentError extends SpodrError {
	constructor( message ) {
		super( message );
		Error.captureStackTrace( this, MissingArgumentError );
	}
}

class NoUpstreamError extends SpodrError {
	constructor( message ) {
		super( message );
		Error.captureStackTrace( this, NoUpstreamError );
	}
}

module.exports = {
	SpodrError                    : SpodrError,
	DirectoryExistsError          : DirectoryExistsError,
	DirectoryNotExistsError       : DirectoryNotExistsError,
	WorkingDirectoryNotCleanError : WorkingDirectoryNotCleanError,
	PackageManagerNotFoundError   : PackageManagerNotFoundError,
	GitNotFoundError              : GitNotFoundError,
	PackageJsonNotFoundError      : PackageJsonNotFoundError,
	MissingArgumentError          : MissingArgumentError,
	NoUpstreamError               : NoUpstreamError
};
