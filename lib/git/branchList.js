"use strict";

class BranchList {
	constructor() {
		this.detached = false;
		this.current  = "";
		this.all      = [];
		this.branches = {};
	}

	push( current, detached, name, commit, label ) {
		if( current ) {
			this.detached = detached;
			this.current  = name;
		}
		this.all.push( name );
		this.branches[ name ] = {
			current : current,
			name    : name,
			commit  : commit,
			label   : label
		};
	}
}

class BranchListFactory {
	constructor() {
		this.detachedRegex = /^(\*?\s+)\(detached from (\S+)\)\s+([a-z0-9]+)\s(.*)$/;
		this.branchRegex   = /^(\*?\s+)(\S+)(?:\s+([a-z0-9]+)\s(.*))?$/;
	}

	parse( output ) {
		const branchList = new BranchList();

		output.split( "\n" )
			.forEach( line => {
				let detached = true;
				let branch   = this.detachedRegex.exec( line );
				if( !branch ) {
					detached = false;
					branch   = this.branchRegex.exec( line );
				}

				if( branch ) {
					branchList.push(
						branch[ 1 ].charAt( 0 ) === "*",
						detached,
						branch[ 2 ],
						branch[ 3 ],
						branch[ 4 ]
					);
				}
			} );

		return branchList;
	}
}

module.exports = new BranchListFactory();
