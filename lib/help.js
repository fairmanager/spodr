"use strict";

class HelpScreens{
	static mainHelp() {
		console.log( "usage: spodr [[command] help]" );
		console.log( "       <command> [<args>]" );
		console.log( "" );
		console.log( "    init             Initializes and creates repositories from a given source  " );
		console.log( "                     in the current directory.                                 " );
		console.log( "    create           Clones all missing repositories in your current directory." );
		console.log( "    check            Checks if the working directories in your current         " );
		console.log( "                     directory are clean.                                      " );
		console.log( "    update           Updates all repositories in your current directory.       " );
		console.log( "    push             Pushes all commits made in all repositories in your       " );
		console.log( "                     current directory.                                        " );
		console.log( "    status           Prints an overview of all repositories in your current    " );
		console.log( "                     directory                                                 " );
		console.log( "" );
		console.log( "    -v, --verbose    verbose output                   " );
		console.log( "    -j, --jobs <n>   set the number of concurrent job." );
		console.log( "                     default:'number of cpu cores'    " );
	}
	static initHelp() {
		console.log( "usage: spodr init" );
		console.log( "       [--github|--gitlab <GROUP>]  [--token <TOKEN>] " );
		console.log( "" );
		console.log( "    --github         github organization to be used.       " );
		console.log( "    --gitlab         gitlab group to be used.              " );
		console.log( "    --token          token to be used for communication.   " );
		console.log( "    --gitlab-host    set gitlab host. default: 'gitlab.com'" );
		console.log( "" );
		console.log( "    environment variables:  " );
		console.log( "" );
		console.log( "        GITLAB_ACCESS_TOKEN    sets the token used for gitlab connections." );
		console.log( "        GITHUB_ACCESS_TOKEN    sets the token used for github connections." );
		console.log( "        GITLAB_HOST            sets the gitlab host. default: 'gitlab.com'" );
	}
	static updateHelp() {
		console.log( "usage: spodr update" );
		console.log( "       [--link] [--linkdep] [--deps] [--skip-git] [--force|-f] " );
		console.log( "" );
		console.log( "    --link         " );
		console.log( "    --linkdep      " );
		console.log( "    --deps         installs dependencies" );
		console.log( "    --skip-git     skips pulling repositories" );
		console.log( "    -f, --force    clears working directories" );
	}
	static statusHelp() {
		console.log( "usage: spodr status" );
		console.log( "       [--skip-git] " );
		console.log( "" );
		console.log( "    --skip-git    skips fetching remotes" );
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
		console.log( `sorry no help found for ${category}` );
	}

}

module.exports = {
	main     : HelpScreens.mainHelp,
	init     : HelpScreens.initHelp,
	update   : HelpScreens.updateHelp,
	notFound : HelpScreens.notFound,
	status   : HelpScreens.statusHelp,
	spodrman : HelpScreens.spodrman
};
