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

class GitCheckoutNotFoundError extends SpodrError {
	constructor( message ) {
		super( message );
		Error.captureStackTrace( this, GitCheckoutNotFoundError );
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

module.exports = {
	SpodrError : SpodrError,
	DirectoryExistsError : DirectoryExistsError,
	DirectoryNotExistsError : DirectoryNotExistsError,
	WorkingDirectoryNotCleanError : WorkingDirectoryNotCleanError,
	PackageManagerNotFoundError : PackageManagerNotFoundError,
	GitNotFoundError : GitNotFoundError,
	GitCheckoutNotFoundError : GitCheckoutNotFoundError,
	PackageJsonNotFoundError : PackageJsonNotFoundError,
	MissingArgumentError : MissingArgumentError
};
