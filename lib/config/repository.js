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
		this.url = undefined; // eslint-disable-line no-undefined

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
	}
}

module.exports = Repository;
