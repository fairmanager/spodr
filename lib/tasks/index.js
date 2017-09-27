"use strict";

module.exports = {
	check : require( "./task.check" ),
	clean : require( "./task.clean" ),
	create : require( "./task.create" ),
	gitStatus : require( "./task.git-status" ),
	linkdep : require( "./task.pm.linkdep" ),
	pmInstall : require( "./task.pm.install.js" ),
	pmLink : require( "./task.pm.link.js" ),
	push : require( "./task.push.js" ),
	unartifact : require( "./task.unartifact" ),
	update : require( "./task.update" ),
	checkUpstream : require( "./task.checkUpstream" )
};
