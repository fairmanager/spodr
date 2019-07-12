"use strict";

/**
 * A Dependency is a dependency declared by a package. If the dependency exists in the storage
 * area is not clear yet. When it is resolved, the dependency is converted to a DependencyTreeNode.
 */
class Dependency {
	/**
	 * Construct a new `Dependency`.
	 * @param {String} name The name of the module.
	 * @param {String} versionTag The version this module was tagged at. Usually a semver range.
	 * @param {Boolean} [isDevelopmentDependency=false] Was this dependency declared as a devDependency?
	 */
	constructor( name, versionTag, isDevelopmentDependency = false ) {
		/**
		 * The name of the module
		 * @type {String}
		 **/
		this.name = name;

		/**
		 * The requested version of the dependency.
		 * @type {String}
		 **/
		this.requestedVersion = versionTag;

		/**
		 * The version that the requested tag was resolved to.
		 * @type {String}
		 **/
		this.resolvedVersion = null;

		/**
		 * Was this dependency declared as a development dependency?
		 * @type {Boolean}
		 **/
		this.isDevelopmentDependency = isDevelopmentDependency;
	}
}

module.exports = Dependency;
