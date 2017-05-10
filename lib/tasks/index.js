"use strict";

module.exports = {
	create     : require( "./task.create" ),
	check      : require( "./task.check" ),
	linkdep    : require( "./task.linkdep" ),
	npmInstall : require( "./task.npm.install.js" ),
	npmLink    : require( "./task.npm.link.js" ),
	push       : require( "./task.push.js" ),
	status     : require( "./task.status" ),
	update     : require( "./task.update" ),
	gitStatus  : require( "./task.git-status" )
};
