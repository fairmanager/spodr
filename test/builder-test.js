"use strict";

const chai           = require( "chai" );
const expect         = require( "chai" ).expect;
const chaiAsPromised = require( "chai-as-promised" );

chai.use( chaiAsPromised );

describe( "ConfigurationBuilder", () => {

	it( "returns configuration with merged CLI args [1]", () => {
		const builder       = require( "../lib/config/builder.js" );
		const configuration = {
			force : false,
			packageManager : "npm",
			parallelExecutions : 4,
			targetRemote : "origin",
			verbose : false
		};
		const expectedConfiguration = {
			force : false,
			packageManager : "yarn",
			parallelExecutions : 4,
			targetRemote : "upstream",
			verbose : true
		};
		const argv = [
			"C:\.nvs\default\node.exe",
			"C:\Projects\spodr\bin\spodr.js",
			"lastlog",
			"-verbose",
			"--yarn",
			"--remote",
			"upstream"
		];

		return expect( builder.mergeCliArgs( configuration, argv ) ).to.eventually.become( expectedConfiguration );
	} );
	it( "returns configuration with merged CLI args [2]", () => {
		const builder       = require( "../lib/config/builder.js" );
		const configuration = {
			force : false,
			packageManager : "npm",
			parallelExecutions : 4,
			targetRemote : "origin",
			verbose : false
		};
		const expectedConfiguration = {
			force : true,
			packageManager : "npm",
			parallelExecutions : 2,
			targetRemote : "upstream",
			verbose : false
		};
		const argv = [
			"C:\.nvs\default\node.exe",
			"C:\Projects\spodr\bin\spodr.js",
			"lastlog",
			"-force",
			"--npm",
			"--upstream",
			"-j2" 
		];

		return expect( builder.mergeCliArgs( configuration, argv ) ).to.eventually.become( expectedConfiguration );
	} );
} );
