"use strict";

const expect  = require( "chai" ).expect;
const mock    = require( "mock-fs" );
const mockery = require( "mockery" );

describe( "PackageManagerTask", () => {
	let PackageManagerTask = null;
	const doesExist = {
		doesExist : ( er, cb ) => {
			cb( null, "exists" );
		}
	};
	const doesNotExist = {
		doesNotExist : ( er, cb ) => {
			er( null );
		}
	};

	beforeEach( () => {
		mockery.enable( {
			useCleanCache : true,
			warnOnReplace : false,
			warnOnUnregistered : false
		} );

	} );
	afterEach( () => {
		mockery.disable();
		mock.restore();
	} );

	it( "checks for and returns the package.json", () => {
		PackageManagerTask = require( "../lib/tasks/task.pm.js" );
		const repo = {
			name : "repo"
		};
		const config = {
			url : undefined
		};
		const pmtask = new PackageManagerTask( repo, config );

		mock( {
			"../spodr/repo/package.json" : "content"
		} );

		return expect( pmtask.getPackageJson().bind( pmtask ) ).to.not.be.rejected;
	} );
	it( "checks for package.json and should reject if non-existent", () => {
		PackageManagerTask = require( "../lib/tasks/task.pm.js" );
		const repo = {
			name : "repo"
		};
		const config = {
			url : undefined
		};
		const pmtask = new PackageManagerTask( repo, config );

		mock( {
			"../spodr/repo/package.txt" : "content"
		} );

		return expect( pmtask.getPackageJson().bind( pmtask ) ).to.be.rejected;
	} );
	it( "checks for package manager and should reject if non-existent", () => {
		mockery.registerMock( "which", doesNotExist.doesNotExist );
		PackageManagerTask = require( "../lib/tasks/task.pm.js" );
		const repo = {
			name : "repo"
		};
		const config = {
			url : undefined,
			packageManager : "npm"
		};
		const pmtask = new PackageManagerTask( repo, config );

		return expect( pmtask.getPackageManagerPath().bind( pmtask ) ).to.be.rejected;
	} );
	it( "checks for and returns the package manager", () => {
		mockery.registerMock( "which", doesExist.doesExist );
		PackageManagerTask = require( "../lib/tasks/task.pm.js" );
		const repo = {
			name : "repo"
		};
		const config = {
			url : undefined,
			packageManager : "npm"
		};
		const pmtask = new PackageManagerTask( repo, config );

		return expect( pmtask.getPackageManagerPath().bind( pmtask ) ).to.be.fulfilled;
	} );
} );
