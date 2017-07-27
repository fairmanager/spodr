"use strict";

const Promise = require( "bluebird" );

const del  = require( "del" );
const fs   = Promise.promisifyAll( require( "fs" ) );
const log  = require( "fm-log" ).module();
const path = require( "path" );

const NODE_MODULES = "node_modules";
const PACKAGE_JSON = "package.json";

/**
 * The UnartifactTask will search the project tree for projects that:
 * - have a node_modules folder
 * - have modules in that folder that do not contain a package.json
 *
 * It will then delete those modules.
 *
 * These modules are usually left-overs from access conflicts during
 * massive npm/yarn operations performed by spodr.
 */
class UnartifactTask {
	constructor( repositories ) {
		const self = this;

		self.repositories = repositories;
	}

	process() {
		return Promise.map( this.repositories, repository => repository.path )
			.filter( this.hasNodeModules )
			.map( this.getNodeModules )
			.reduce( ( allModules, projectModules ) => allModules.concat( projectModules ), [] )
			.filter( this.hasNoPackageJson )
			.map( invalidModule => {
				log.warn( `Deleting ${invalidModule}.` );
				return del( invalidModule )
					.catch( error => log.error( error.message ) );
			} )
			.then( () => log.info( "Done" ) );
	}

	hasNoPackageJson( directory ) {
		const packageJsonPath = path.resolve( directory, PACKAGE_JSON );
		return fs.statAsync( packageJsonPath )
			.then( () => false )
			.catch( () => true );
	}

	getNodeModules( directory ) {
		const nodeModulesPath = path.resolve( directory, NODE_MODULES );
		return fs.readdirAsync( nodeModulesPath )
			.filter( nodeModule => !nodeModule.startsWith( "@" ) )
			.filter( nodeModule => !nodeModule.startsWith( "." ) )
			.map( nodeModule => path.resolve( directory, NODE_MODULES, nodeModule ) );
	}

	hasNodeModules( directory ) {
		const nodeModulesPath = path.resolve( directory, NODE_MODULES );
		return fs.statAsync( nodeModulesPath )
			.catch( () => false );
	}

	getProjects( directory ) {
		return fs.readdirAsync( directory )
			.filter( file => fs.statAsync( file )
				.then( fileStat => fileStat.isDirectory() ) )
			.map( project => path.resolve( directory, project ) )
			.then( projects => {
				projects.sort();
				return projects;
			} );
	}
}

function taskFactory( folder ) {
	const task = new UnartifactTask( folder );
	return task.process();
}

module.exports = taskFactory;
