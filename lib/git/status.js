"use strict";

class Status {
	constructor() {
		this.notAdded   = [];
		this.deleted    = [];
		this.modified   = [];
		this.created    = [];
		this.conflicted = [];
		this.ahead      = 0;
		this.behind     = 0;
		this.current    = null;
		this.tracking   = null;
	}

	isClean() {
		return this.notAdded.length === 0 && this.deleted.length === 0 && this.modified.length === 0 && this.created.length === 0 && this.conflicted.length === 0;
	}

/* eslint-disable func-names */
	static get parsers() {
		return {
			"##" : function( line, status ) {
				const aheadReg    = /ahead (\d+)/;
				const behindReg   = /behind (\d+)/;
				const currentReg  = /^(.+?(?=(?:\.{3}|\s|$)))/;
				const trackingReg = /\.{3}(\S*)/;

				let regexResult = null;

				regexResult  = aheadReg.exec( line );
				status.ahead = regexResult && Number( regexResult[ 1 ] ) || 0;

				regexResult   = behindReg.exec( line );
				status.behind = regexResult && Number( regexResult[ 1 ] ) || 0;

				regexResult    = currentReg.exec( line );
				status.current = regexResult && regexResult[ 1 ];

				regexResult     = trackingReg.exec( line );
				status.tracking = regexResult && regexResult[ 1 ];
			},

			"??" : function( line, status ) {
				status.notAdded.push( line );
			},

			D : function( line, status ) {
				status.deleted.push( line );
			},

			M : function( line, status ) {
				status.modified.push( line );
			},

			A : function( line, status ) {
				status.created.push( line );
			},

			AM : function( line, status ) {
				status.created.push( line );
			},

			UU : function( line, status ) {
				status.conflicted.push( line );
			}
		};
	}
}
/* eslint-enable func-names */

class StatusFactory {
	constructor() {
		this.detachedRegex = /^(\*?\s+)\(detached from (\S+)\)\s+([a-z0-9]+)\s(.*)$/;
		this.branchRegex   = /^(\*?\s+)(\S+)\s+([a-z0-9]+)\s(.*)$/;
	}

	parse( output ) {
		const status = new Status();

		let line    = null;
		let handler = null;

		const lines = output.trim().split( "\n" );

		// eslint-disable-next-line no-cond-assign
		while( line = lines.shift() ) {
			line = line.trim().match( /(\S+)\s+(.*)/ );
			if( line && ( handler = Status.parsers[ line[ 1 ] ] ) ) {
				handler( line[ 2 ], status );
			}
		}

		return status;
	}
}

module.exports = new StatusFactory();
