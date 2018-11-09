"use strict";

const expect = require( "chai" ).expect;

describe( "RepositoryBuilder", () => {
	const Repository = require( "../lib/config/repository.js" );

	it( "Constructs a Repository instance", () => {
		expect( new Repository( "repo" ) ).to.be.instanceof( Repository );
	} );
	it( "Contains the expected properties", () => {
		const repo = new Repository( "repo" );

		expect( repo.name ).to.equal( "repo" );
		expect( repo.url ).to.equal( undefined );
		expect( repo.link ).to.equal( true );
		expect( repo.linkDep ).to.equal( true );
		expect( repo.deps ).to.equal( true );
		expect( repo.lastlog ).to.equal( true );
		expect( repo.status ).to.equal( true );
		expect( repo.update ).to.equal( true );
		expect( repo.push ).to.equal( true );
		expect( repo.sortAbove ).to.equal( undefined );
		expect( repo.sortBelow ).to.equal( undefined );
	} );
} );
