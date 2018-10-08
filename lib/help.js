"use strict";

const _                    = require( "lodash" );
/* eslint-disable no-console */
class HelpScreens {
	static mainHelp() {
		console.log( "usage: spodr [[command] help]" );
		console.log( "       <command> [<args>]" );
		console.log( "" );
		console.log( "    init             Initializes and creates repositories from a given source  " );
		console.log( "                     in the current directory.                                 " );
		console.log( "    create           Clones all missing repositories in your current directory." );
		console.log( "    check            Checks if the working directories in your current         " );
		console.log( "                     directory are clean.                                      " );
		console.log( "    clean            Deletes all local changes in all repositories.            " );
		console.log( "    update           Updates all repositories in your current directory.       " );
		console.log( "    push             Pushes all commits made in all repositories in your       " );
		console.log( "                     current directory.                                        " );
		console.log( "    lastlog          Prints the commit message of the latest commit.           " );
		console.log( "    status           Prints an overview of all repositories in your current    " );
		console.log( "                     directory                                                 " );
		console.log( "    peek             An alias for `spodr status --skip-git`                    " );
		console.log( "" );
		console.log( "    -v, --verbose    verbose output                       " );
		console.log( "    -j, --jobs <n>   set the number of concurrent jobs.   " );
		console.log( "                     default: 'number of cpu cores'       " );
		console.log( "    --yarn           Use yarn as package manager.         " );
		console.log( "    --npm            Use npm as package manager (default)." );
		console.log( "    --skip-git       Don't run `git fetch --all`.         " );
	}
	static initHelp() {
		console.log( "usage: spodr init" );
		console.log( "       [--github|--gitlab <GROUP>]  [--token <TOKEN>] " );
		console.log( "" );
		console.log( "    --github         GitHub organization to be used.       " );
		console.log( "    --gitlab         GitLab group to be used.              " );
		console.log( "    --token          Token to be used for communication.   " );
		console.log( "    --gitlab-host    Set GitLab host.                      " );
		console.log( "                     default: 'gitlab.com'                 " );
		console.log( "" );
		console.log( "    environment variables:  " );
		console.log( "" );
		console.log( "        GITLAB_ACCESS_TOKEN    Sets the token used for gitlab connections." );
		console.log( "        GITHUB_ACCESS_TOKEN    Sets the token used for github connections." );
		console.log( "        GITLAB_HOST            Sets the gitlab host.                      " );
		console.log( "                               default: 'gitlab.com'                      " );
	}
	static createHelp() {
		console.log( "usage: spodr create" );
	}
	static checkHelp() {
		console.log( "usage: spodr check" );
	}
	static cleanHelp() {
		console.log( "usage: spodr clean" );
	}
	static updateHelp() {
		console.log( "usage: spodr update" );
		console.log( "       [--link] [--linkdep] [--deps] [--skip-git] [--force|-f] " );
		console.log( "" );
		console.log( "    --link         Prepares all projects for linkdep operation.         " );
		console.log( "    --linkdep      Symlink projects into dependant projects.            " );
		console.log( "    --deps         Installs dependencies.                               " );
		console.log( "    --skip-git     Skips pulling repositories.                          " );
		console.log( "                   This is automatically enforced by other operations.  " );
		console.log( "    -f, --force    Clears working directories if they're dirty.         " );
	}
	static pushHelp() {
		console.log( "usage: spodr push" );
	}
	static statusHelp() {
		console.log( "usage: spodr status" );
		console.log( "       [--skip-git] [--small] [--name-only] [--min|-m]" );
		console.log( "" );
		console.log( "    --skip-git     skips fetching remotes" );
		console.log( "    --small        show smaller table" );
		console.log( "    --name-only    hide path of the repository" );
		console.log( "    -m, --min      shorthand for --small --name-only" );
	}
	static spodrman() {

		console.log( String.raw`

                    _..,.._             ______  ____   ____  _____   ____
               _-'''  /    '''-,_       |_____ |____] |    | |    \ |____/
            _-|    ,,/.        _/';,    ____ | |      |____| |____/ |   \_
          ,' ,/'''' / ''---./'      ';
        :' ,/ |    /     _,/'         \       _______ _______ __   _
       /\-/   |  _/,   ,/    \        _|      |  |  | |_____| | \  |
      /  \  _-|''/  \_/       '\,_.-'' \      |  |  | |     | |  \_|
     /'#''\'  |  |  / \,    ,-'' \;,____\                       _
    |# ##  \  |  |_/    \,####''''#      ',       _____ _ _ ___| |_
    ####....\..\++X__,+;  ##   # #''-.._   ',    |     | | |  _|   |  _
    \ /___/    / |    \ ''#######'\,   _'':/ ',  |_|_|_|___|___|_|_|_| |___
     \   /'''\/''|-''''+---,\ ',    \.'     '\_\       |_ -| . | . | . |  _|
      \,/___ |    \    \    ',  ', /''\       _\\      |___|  _|___|___|_|
        \_  \|'''''\,'''+,.-.+-''+/    '\   /'   \         |_|
          '._|_     \   |    ',   ',  __,;+'      \
               '---.|.___\  __|,/'''+'     \       |+,
                         '\;  |     |        \   ,-|  ',
                            '--,     \    ____\ / /     \_
                             ,'' \____\_ / ___/'''        ',_
                           ,'      \___./''                  ',
                         ,'___________________________________|` );
	}
	static notFound( category ) {
		console.log( `sorry no help found for ${category}.` );
	}
	static spodrmanBusy() {
		console.log( `sorry spodrman is too busy to help you.` );
	}

}
/* eslint-enable no-console */

module.exports = {
	main     : HelpScreens.mainHelp,
	notFound : HelpScreens.notFound,
	spodrman : HelpScreens.spodrman,
	screens  : {
		init   : HelpScreens.initHelp,
		create : HelpScreens.createHelp,
		check  : HelpScreens.checkHelp,
		clean  : HelpScreens.cleanHelp,
		update : HelpScreens.updateHelp,
		push   : HelpScreens.pushHelp,
		status : HelpScreens.statusHelp,
		man    : HelpScreens.spodrmanBusy
	},
	getHelp : screenName => {
		const screens = module.exports.screens;
		if( _.isFunction( screens[ screenName ] ) ) {
			screens[ screenName ]();
		} else {
			module.exports.notFound( screenName );
		}
	}
};
