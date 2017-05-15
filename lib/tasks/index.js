"use strict";

module.exports = {
	create    : require( "./task.create" ),
	check     : require( "./task.check" ),
	linkdep   : require( "./task.pm.linkdep" ),
	pmInstall : require( "./task.pm.install.js" ),
	pmLink    : require( "./task.pm.link.js" ),
	push      : require( "./task.push.js" ),
	status    : require( "./task.status" ),
	update    : require( "./task.update" ),
	gitStatus : require( "./task.git-status" )
};
