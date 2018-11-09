"use strict";

class VersionLock {
	constructor( packageName, ifVersionMatches, replaceWith ) {
		this.packageName      = packageName;
		this.ifVersionMatches = ifVersionMatches;
		this.replaceWith      = replaceWith;
	}
}

class VersionLockDirectory extends Map {
	/**
	 * Retrieve the locks declared for a given package.
	 * @param {String} packageName The name of the package.
	 */
	getPackageLocks( packageName ) {
		return this.get( packageName );
	}

	/**
	 * Lock down a version of a package to a different one.
	 * @param {String} packageName The name of the package.
	 * @param {String} ifVersionMatches A semver range that we're going to match against.
	 * @param {String} replaceWith The version we will use instead of the matched one.
	 */
	lock( packageName, ifVersionMatches, replaceWith ) {
		let versionLocksForPackage = this.getPackageLocks( packageName );
		if( !versionLocksForPackage ) {
			versionLocksForPackage = [];
			this.set( packageName, versionLocksForPackage );
		}

		versionLocksForPackage.push( new VersionLock( packageName, ifVersionMatches, replaceWith ) );
	}
}

class PackageManagerConfiguration {
	constructor() {
		/**
		 * When we see a package in the global dependency tree and that package exists in the work area,
		 * regardless of the versions involved, link the "root" project from the work area into the
		 * projects that require it, instead of downloading the desired version from the registry.
		 * @type {Boolean}
		 * @default true
		 */
		this.pinRoots = true;

		/**
		 * When generating the global dependency tree, should we ask the registry about the latest version
		 * information for each package, or should we use whatever packages we have in the cache?
		 *
		 * When we *don't* update, we will just re-generate `node_modules` from the packages we have in the
		 * cache and download those for which we don't have a matching target.
		 *
		 * When we *do* update, this also has the effect that all declared semver ranges will resolve to
		 * the latest possible version.
		 * @type {Boolean}
		 * @default false
		 */
		this.updateDependencies = false;

		/**
		 * A map of package names to instructions on how to lock down specific versions of this package.
		 * @type {VersionLockDirectory}
		 */
		this.locks = new VersionLockDirectory();
	}

	loadLocksFromFile( filename ) {
		const lockDefinitions = require( filename );
		Object.keys( lockDefinitions ).forEach( packageName => {
			const versionLocks = lockDefinitions[ packageName ];
			Object.keys( versionLocks ).forEach( ifVersionMatches => {
				const replaceWith = versionLocks[ ifVersionMatches ];
				this.locks.lock( packageName, ifVersionMatches, replaceWith );
			} );
		} );
	}
}

module.exports = PackageManagerConfiguration;
