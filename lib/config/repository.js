"use strict";

class Repository {
	/**
	 * Constructs a Repository instance.
	 * @param {String} [name] The name of the repository.
	 */
	constructor( name ) {
		/**
		 * The name of the repository. Usually the project name.
		 * @type {string}
		 * @default undefined
		 */
		this.name = name;

		/**
		 * The URL this repository can be cloned from.
		 * @type {string}
		 * @default undefined
		 */
		// eslint-disable-next-line no-undefined
		this.url = undefined;

		/**
		 * Make this project globally available.
		 * @type {boolean}
		 */
		this.link = true;

		/**
		 * Perform dependency linking in this repository.
		 * @type {boolean}
		 * @default true
		 */
		this.linkDep = true;

		/**
		 * Perform npm install in each repository.
		 * @type {boolean}
		 * @default true
		 */
		this.deps = true;

		/**
		 * Omit this repository for spodr lastlog.
		 * @type {boolean}
		 * @default true
		 */
		this.lastlog = true;

		/**
		 * Omit this repository for spodr status.
		 * @type {boolean}
		 * @default true
		 */
		this.status = true;

		/**
		 * Omit this repository for spodr update.
		 * @type {boolean}
		 * @default true
		 */
		this.update = true;

		/**
		 * Omit this repository for spodr push.
		 * @type {boolean}
		 * @default true
		 */
		this.push = true;

		/**
		 * Place repository above another.
		 * @type {string}
		 * @default undefined
		 */
		// eslint-disable-next-line no-undefined
		this.sortAbove = undefined;

		/**
		 * Place repository below another.
		 * @type {string}
		 * @default undefined
		 */
		// eslint-disable-next-line no-undefined
		this.sortBelow = undefined;
	}
}

module.exports = Repository;
