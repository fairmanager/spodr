"use strict";

const expect = require( "chai" ).expect;

describe( "ConfigurationConstructor", () => {
	const Configuration = require( "../lib/config/configuration.js" );

	it( "Constructs a Configuration instance", () => {
		expect( new Configuration() ).to.be.instanceof( Configuration );
	} );
	it( "Contains the expected properties", () => {
		const config = new Configuration();

		expect( config.repositories ).to.be.empty;
		expect( config.parallelExecutions ).to.equal( Math.min( 4, require( "os" ).cpus().length ) );
		expect( config.packageManager ).to.equal( "npm" );
		expect( config.targetRemote ).to.equal( "origin" );
		expect( config.force ).to.equal( false );
		expect( config.verbose ).to.equal( false );
	} );
} );
