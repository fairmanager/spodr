"use strict";

/**
 * Collects information about the progress and result of a downloader run.
 */
class DownloaderStatistics {
	constructor() {
		/**
		 * How many packages are we searching for in this stage?
		 * @type {Number}
		 */
		this.packagesTotal = 0;

		/**
		 * How many packages have we downloaded in this stage?
		 * @type {Number}
		 */
		this.packagesDownloaded = 0;

		/**
		 * How many packages, we were looking for, were already in the cache?
		 * @type {Number}
		 */
		this.packagesAlreadyInCache = 0;

		/**
		 * How many packages failed to be retrieved?
		 * @type {Number}
		 */
		this.packagesFailed = 0;

		/**
		 * When will we show the next progress update to the user?
		 * @type {Number}
		 */
		this.nextProgressUpdate = Math.MAX_SAFE_INTEGER;

		/**
		 * How many downloads have to succeed before we might show another progress update?
		 * @type {Number}
		 */
		this.progressStep = Math.MAX_SAFE_INTEGER;

		/**
		 * Should we stay silent even if a progress update seems appropriate?
		 * @type {Boolean}
		 */
		this.__emitterBlocked = true;
	}

	/**
	 * Block the emitter. The next progress update will not be shown before unblock() is called.
	 */
	block() {
		this.__emitterBlocked = true;
	}

	/**
	 * Unblock the emitter. The next progress update will be shown.
	 */
	unblock() {
		this.__emitterBlocked = false;
	}
}

module.exports = DownloaderStatistics;
