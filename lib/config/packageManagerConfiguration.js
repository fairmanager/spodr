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
	 * @return {Array<VersionLock>}
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

class PluginMap extends Map {
}

class PeeringOffer {
	/**
	 * Construct a new `PeeringOffer`.
	 * @param {String} packageName The name of the host package.
	 * @param {String} ifVersionMatches The version range allowed for the host package.
	 * @param {PluginMap} pluginMap The packages that will be allowed to peer with the host package.
	 */
	constructor( packageName, ifVersionMatches, pluginMap ) {
		this.packageName      = packageName;
		this.ifVersionMatches = ifVersionMatches;
		this.pluginMap        = pluginMap;
	}
}

class PeeringDirectory extends Map {
	/**
	 * Retrieve the peering offers for a given package.
	 * @param {String} packageName The name of the package.
	 * @return {Array<PeeringOffer>}
	 */
	getPeeringOffers( packageName ) {
		return this.get( packageName );
	}

	/**
	 * Offer certain packages to peer with a host package.
	 * @param {String} packageName The name of the host package.
	 * @param {String} ifVersionMatches A semver range that we're going to match against for the host package.
	 * @param {PluginMap} peerWith The packages and the versions that should be allowed to peer with the host package.
	 */
	offerPeer( packageName, ifVersionMatches, peerWith ) {
		let peeringOffersForPackage = this.getPeeringOffers( packageName );
		if( !peeringOffersForPackage ) {
			peeringOffersForPackage = [];
			this.set( packageName, peeringOffersForPackage );
		}

		peeringOffersForPackage.push( new PeeringOffer( packageName, ifVersionMatches, peerWith ) );
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

		/**
		 * A map of package names to instructions on which other packages should always be registered as
		 * peerDependencies of the former packages.
		 * @type {PeeringDirectory}
		 */
		this.peering = new PeeringDirectory();
	}

	static fromFile( filename ) {
		const packageManagerConfiguration = new PackageManagerConfiguration();

		const lockConfiguration = require( filename );
		// Load version locking information if it is available.
		if( lockConfiguration.locks ) {
			Object.keys( lockConfiguration.locks ).forEach( packageName => {
				const versionLocks = lockConfiguration.locks[ packageName ];
				Object.keys( versionLocks ).forEach( ifVersionMatches => {
					const replaceWith = versionLocks[ ifVersionMatches ];
					packageManagerConfiguration.locks.lock( packageName, ifVersionMatches, replaceWith );
				} );
			} );
		}

		// Load package peering information if it is available.
		if( lockConfiguration.peering ) {
			Object.keys( lockConfiguration.peering ).forEach( packageName => {
				const peerHostConfiguration = lockConfiguration.peering[ packageName ];
				Object.keys( peerHostConfiguration ).forEach( ifVersionMatches => {
					const peerWith = peerHostConfiguration[ ifVersionMatches ];
					packageManagerConfiguration.peering
						.offerPeer( packageName, ifVersionMatches, new PluginMap( Object.entries( peerWith ) ) );
				} );
			} );
		}

		return packageManagerConfiguration;
	}
}

module.exports = PackageManagerConfiguration;
