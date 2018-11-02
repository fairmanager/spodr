"use strict";

const chai           = require( "chai" );
const expect         = require( "chai" ).expect;
const chaiAsPromised = require( "chai-as-promised" );
const sinon          = require( "sinon" );
const sinonChai      = require( "sinon-chai" );
const mockery        = require( "mockery" );
const fs             = require( "fs" );

chai.use( chaiAsPromised );
chai.use( sinonChai );

describe( "Repository Sorting", () => {
	before( () => {
		mockery.enable( {
			useCleanCache : true,
			warnOnReplace : false,
			warnOnUnregistered : false
		} );

		mockery.registerMock( "fs", {
			existsSync : () => true
		} );

	} );
	after( () => {
		mockery.disable();
	} );
	it( "Test basic sorting [1]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : "b"
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const c = {
			name : "c",
			sortAbove : "a",
			sortBelow : undefined
		};
		const d = {
			name : "d",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b, c, d ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ b, c, a, d ] );
	} );
	it( "Test basic sorting [2]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const c = {
			name : "c",
			sortAbove : "b",
			sortBelow : undefined
		};
		const d = {
			name : "d",
			sortAbove : undefined,
			sortBelow : "c"
		};
		application.config = {
			repositories : [ a, b, c, d ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ a, c, b, d ] );
	} );
	it( "Test basic sorting [3]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : "d"
		};
		const c = {
			name : "c",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const d = {
			name : "d",
			sortAbove : undefined,
			sortBelow : "c"
		};
		application.config = {
			repositories : [ a, b, c, d ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ a, c, d, b ] );
	} );
	it( "Test basic sorting [4]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : "d"
		};
		const b = {
			name : "b",
			sortAbove : "c",
			sortBelow : undefined
		};
		const c = {
			name : "c",
			sortAbove : "d",
			sortBelow : undefined
		};
		const d = {
			name : "d",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b, c, d ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ b, c, d, a ] );
	} );
	it( "Test basic sorting [5]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : "e"
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const c = {
			name : "c",
			sortAbove : "b",
			sortBelow : undefined
		};
		const d = {
			name : "d",
			sortAbove : "c",
			sortBelow : undefined
		};
		const e = {
			name : "e",
			sortAbove : undefined,
			sortBelow : "b"
		};
		application.config = {
			repositories : [ a, b, c, d, e ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ d, c, b, e, a ] );
	} );
	it( "Test basic sorting [6]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : "c"
		};
		const c = {
			name : "c",
			sortAbove : undefined,
			sortBelow : "a"
		};
		const d = {
			name : "d",
			sortAbove : "a",
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b, c, d ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ d, a, c, b ] );
	} );
	it( "Test basic sorting [7]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const c = {
			name : "c",
			sortAbove : "a",
			sortBelow : undefined
		};
		const d = {
			name : "d",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b, c, d ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ c, a, b, d ] );
	} );
	it( "Test basic sorting [8]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : "c"
		};
		const c = {
			name : "c",
			sortAbove : undefined,
			sortBelow : "d"
		};
		const d = {
			name : "d",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b, c, d ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ a, d, c, b ] );
	} );
	it( "Test basic sorting [9]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : "d"
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const c = {
			name : "c",
			sortAbove : "b",
			sortBelow : undefined
		};
		const d = {
			name : "d",
			sortAbove : undefined,
			sortBelow : "b"
		};
		application.config = {
			repositories : [ a, b, c, d ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ c, b, d, a ] );
	} );
	it( "Sorting 2 Repositories with different settings [1]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ a, b ] );
	} );
	it( "Sorting 2 Repositories with different settings [2]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : "b"
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ b, a ] );
	} );
	it( "Sorting 2 Repositories with different settings [3]", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : "a",
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b ]
		};

		return expect( application.prepareRepositories() ).to.eventually.have.ordered.members( [ b, a ] );
	} );
	it( "Sorting 2 Repositories with different settings [4] and expecting an error", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : "b",
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : "a"
		};
		application.config = {
			repositories : [ a, b ]
		};

		expect( application.prepareRepositories ).to.throw();
	} );
	it( "Sorting 2 Repositories with different settings [5] and expecting an error", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : "b"
		};
		const b = {
			name : "b",
			sortAbove : "a",
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b ]
		};

		expect( application.prepareRepositories ).to.throw();
	} );
	it( "SortAbove itself should throw an error", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : "a",
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b ]
		};

		expect( application.prepareRepositories ).to.throw();
	} );
	it( "SortBelow itself should throw an error", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : "a",
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b ]
		};

		expect( application.prepareRepositories ).to.throw();
	} );
	it( "Using both sortAbove and sortBelow at the same repository should throw an error", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : "a",
			sortBelow : "b"
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b ]
		};

		expect( application.prepareRepositories ).to.throw();
	} );
	it( "Using sortAbove/sortBelow with an unknown repository name should throw an error", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : "c",
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b ]
		};

		expect( application.prepareRepositories ).to.throw();
	} );
	it( "Setting that would sort indefinitely should throw an error", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : "b"
		};
		const b = {
			name : "b",
			sortAbove : undefined,
			sortBelow : "a"
		};
		application.config = {
			repositories : [ a, b ]
		};

		expect( application.prepareRepositories ).to.throw();
	} );
	it( "Defining sortAbove/sortBelow with a non-string value should throw an error", () => {
		const application = require( "../lib/app.js" );
		const a     = {
			name : "a",
			sortAbove : undefined,
			sortBelow : undefined
		};
		const b = {
			name : "b",
			sortAbove : a,
			sortBelow : undefined
		};
		application.config = {
			repositories : [ a, b ]
		};

		expect( application.prepareRepositories ).to.throw();
	} );
} );
