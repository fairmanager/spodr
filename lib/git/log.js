"use strict";

class Log {
	constructor() {
		this.entries = [];
	}

	push( header, date, author, parents ) {
		this.entries.push( {
			header : header,
			date : date,
			author : author,
			parents : parents
		} );
	}
}

class LogFactory {
	get elementDelimiter() {
		return "~&>8~#@~8<&~";
	}
	get delimiter() {
		return "~!---------------------- >8~ ----------------------!~";
	}
	get formats() {
		return [
			"%P", "%H", "%at", "%b", "%T",
			"%an", "%ae", "%ar", "%aI",
			"%s", "%D"
		].join( this.elementDelimiter );
	}

	parse( output ) {
		const log = new Log();

		output.split( this.delimiter )
			.forEach( logEntry => {
				const elements = logEntry.split( this.elementDelimiter );
				log.push(
					elements[ 9 ],
					{
						absolute : new Date( Number( elements[ 2 ] ) ),
						relative : elements[ 7 ],
						timestamp : elements[ 8 ]
					},
					{
						name : elements[ 5 ],
						email : elements[ 6 ]
					},
					elements[ 0 ].length ? elements[ 0 ].split( " " ) : [] );
			} );

		return log;
	}
}

module.exports = new LogFactory();
