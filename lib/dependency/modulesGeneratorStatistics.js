"use strict";

/**
 * Collects statistics about the generation process of `node_modules` folders.
 */
class ModulesGeneratorStatistics {
	/**
	 * Constructs a new `ModulesGeneratorStatistics`.
	 */
	constructor() {
		/** @type {Number} */
		this.linksCreated = 0;

		/** @type {Number} */
		this.linksCreatedBin = 0;
	}
}

module.exports = ModulesGeneratorStatistics;
