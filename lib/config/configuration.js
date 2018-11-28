"use strict";

class Configuration {
	constructor() {
		/**
		 * A set of repositories that spodr interacts with.
		 * @type {Array<Repository>}
		 */
		this.repositories = [];

		/**
		 * The amount of tasks that should be performed in parallel.
		 * @type {Number}
		 * @default The number of available cores on the host.
		 */
		this.parallelExecutions = Math.min( 4, require( "os" ).cpus().length );

		/**
		 * The package manager to use.
		 * Should either be `npm` (default) or `yarn`.
		 * @type {String}
		 * @default "npm"
		 */
		this.packageManager = "npm";

		/**
		 * The git remote that should be used during operations.
		 * @type {String}
		 * @default "origin"
		 */
		this.targetRemote = "origin";

		/**
		 * The git branch that should be used during the opteraions.
		 * @type {String}
		 * @default null
		 */
		this.targetBranch = null;

		/**
		 * Should operations be "forced". The meaning is task-dependent.
		 * @type {boolean}
		 * @default false
		 */
		this.force = false;

		/**
		 * Should output be "verbose". The meaning is task-dependent.
		 * Usually results in a lot more output, useful for debugging.
		 * @type {boolean}
		 * @default false
		 */
		this.verbose = false;
	}
}

module.exports = Configuration;
