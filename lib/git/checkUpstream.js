"use strict";

class CheckUpstream {
	parse( output ) {
		if( output === "" ) {
			return [];
		}
		return output.split( "\n" );
	}
}

module.exports = new CheckUpstream();
