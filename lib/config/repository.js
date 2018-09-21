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
		this.link = false;

		/**
		 * Perform dependency linking in this repository.
		 * @type {boolean}
		 * @default false
		 */
		this.linkDep = false;

		/**
		 * Perform npm install in each repository.
		 * @type {boolean}
		 * @default false
		 */
		this.deps = false;

		/**
		 * Omit this repository for spodr lastlog.
		 * @type {boolean}
		 * @default false
		 */
		this.lastlog = false;

		/**
		 * Omit this repository for spodr status.
		 * @type {boolean}
		 * @default false
		 */
		this.status = false;

		/**
		 * Omit this repository for spodr update.
		 * @type {boolean}
		 * @default false
		 */
		this.update = false;

		/**
		 * Omit this repository for spodr push.
		 * @type {boolean}
		 * @default false
		 */
		this.push = false;

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
