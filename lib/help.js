"use strict";

class HelpScreens{
	static mainHelp(){
		console.log( "usage: spodr [[command] help]" );
		console.log( "       <command> [<args>]" );
		console.log( "" );
		console.log( "    init      Initializes and creates repositories from a given source in the current directory." );
		console.log( "    create    Clones all missing repositories in your current directory." );
		console.log( "    check     Checks if the working directories in your current directory are clean." );
		console.log( "    update    Updates all repositories in your current directory." );
		console.log( "    push      Pushes all commits made in all repositories in your current directory." );
		console.log( "    status    Prints an overview of all repositories in your current directory" );
	}
	static initHelp(){
		console.log( "usage: spodr init" );
		console.log( "       <--github|--gitlab GROUP>  [--token TOKEN] " );
		console.log( "" );
		console.log( "    --github    github organization to be used" );
		console.log( "    --gitlab    gitlab group to be used" );
		console.log( "    --token     token to be used for communication" );
		console.log( "" );
		console.log( "    the tokens can be set as following environment variables" );
		console.log( "        GITLAB_ACCESS_TOKEN, GITHUB_ACCESS_TOKEN" );
	}
	static updateHelp(){
		console.log( "usage: spodr update" );
		console.log( "       [--link] [--linkdep] [--deps] [--skip-git] " );
		console.log( "" );
		console.log( "    --link        " );
		console.log( "    --linkdep     " );
		console.log( "    --deps        installs dependencies" );
		console.log( "    --skip-git    skips pulling repositories" );
	}
	static statusHelp(){
		console.log( "usage: spodr status" );
		console.log( "       [--skip-git] " );
		console.log( "" );
		console.log( "    --skip-git    skips fetching remotes" );
	}
	static spodrman(){
		console.log( "" );
		console.log( "" );
		console.log( "                    _..,.._             ______  ____   ____  _____   ____   " );
		console.log( "               _-'''  /    '''-,_       |_____ |____] |    | |    \ |____/  " );
		console.log( "            _-|    ,,/.        _/';,    ____ | |      |____| |____/ |   \_  " );
		console.log( "          ,' ,/'''' / ''---./'      ';                                      " );
		console.log( "        :' ,/ |    /     _,/'         \       _______ _______ __   _        " );
		console.log( "       /\-/   |  _/,   ,/    \        _|      |  |  | |_____| | \  |        " );
		console.log( "      /  \  _-|''/  \_/       '\,_.-'' \      |  |  | |     | |  \_|        " );
		console.log( "     /'#''\'  |  |  / \,    ,-'' \;,____\                       _           " );
		console.log( "    |# ##  \  |  |_/    \,####''''#      ',       _____ _ _ ___| |_         " );
		console.log( "    ####....\..\++X__,+;  ##   # #''-.._   ',    |     | | |  _|   |  _     " );
		console.log( "    \ /___/    / |    \ ''#######'\,   _'':/ ',  |_|_|_|___|___|_|_|_| |___ " );
		console.log( "     \   /'''\/''|-''''+---,\ ',    \.'     '\_\       |_ -| . | . | . |  _|" );
		console.log( "      \,/___ |    \    \    ',  ', /''\       _\\      |___|  _|___|___|_|  " );
		console.log( "        \_  \|'''''\,'''+,.-.+-''+/    '\   /'   \         |_|              " );
		console.log( "          '._|_     \   |    ',   ',  __,;+'      \                         " );
		console.log( "               '---.|.___\  __|,/'''+'     \       |+,                      " );
		console.log( "                         '\;  |     |        \   ,-|  ',                    " );
		console.log( "                            '--,     \    ____\ / /     \_                  " );
		console.log( "                             ,'' \____\_ / ___/'''        ',_               " );
		console.log( "                           ,'      \___./''                  ',             " );
		console.log( "                         ,'___________________________________|             " );
	}
	static notFound(category){
		console.log(`sorry no help found for ${category}`)
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
