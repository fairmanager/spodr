"use strict";

module.exports = {
	check : require( "./task.check" ),
	checkout : require( "./task.checkout" ),
	clean : require( "./task.clean" ),
	create : require( "./task.create" ),
	gitLastLog : require( "./task.git-lastlog" ),
	gitStatus : require( "./task.git-status" ),
	install : require( "./task.install" ),
	linkdep : require( "./task.pm.linkdep" ),
	pmInstall : require( "./task.pm.install" ),
	pmLink : require( "./task.pm.link" ),
	push : require( "./task.push.js" ),
	unartifact : require( "./task.unartifact" ),
	update : require( "./task.update" )
};
