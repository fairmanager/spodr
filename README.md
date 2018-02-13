# spodr
[![npm version](https://badge.fury.io/js/spodr.svg)](https://badge.fury.io/js/spodr)
[![Build Status (master)](https://travis-ci.org/fairmanager/spodr.svg?branch=master)](https://travis-ci.org/fairmanager/spodr)

dev HEAD: [![Build Status (dev)](https://travis-ci.org/fairmanager/spodr.svg?branch=dev)](https://travis-ci.org/fairmanager/spodr)

## Introduction
spodr is a utility to manage a work area that contains software projects that are usually:

- using git
- NodeJS-based
- dependent upon each other

spodr will take over common tasks like linking projects with each other or keeping code and dependencies up-to-date.

Note that spodr is somewhat opinionated. This is most apparent with the handling of git branches. spodr has the desire to always check out a branch named `dev`, if it exists, unless you're currently on a branch that is neither `dev` nor `master`.

## Getting Started
### Preparing the Work Area
#### Init

To begin working with spodr, enter an empty folder that will become your work area and clone some of your existing projects.

You can also just take any existing folder that contains your git checkouts. spodr does not maintain any metadata that would designate your work area in any specific way.

spodr also comes with 2 importers that allow you to easily clone all projects from a GitHub organization or a GitLab group. These might require you to provide an API access token. Follow the instructions in the console output.

```shell
$ spodr init --github stacktracejs
```

> By default, spodr will try to run as many processes as possible. This *can* cause problems because multiple `npm` processes have the tendency to saturate any system (which, in turn, triggers further race-condition based bugs in `npm` and `yarn`) and they are prone to failure when running in parallel. Thus, it may be advisable to limit the number of concurrent processes using the `--jobs` argument.

When using your own GitLab server, you have to specify that with `--gitlab-host` or through the `GITLAB_HOST` environment variable.

spodr will check out the default branch as configured server-side. If you want to ensure that you get the `dev` branch, run `spodr update`.

#### Linking

> Warning: This can take a long time, as dependencies are usually installed during linking. However, trying to install all dependencies before linking will cause nasty issues down the line. If you plan on using linking, do it first. If you already have dependencies installed, delete them (`rm -rf */node_modules`) and start over.

spodr supports linking multiple projects with each other by utilizing the `npm link` and `yarn link` mechanism. This a 2-step process where you first register a module globally and then link it locally in the desired projects.

> spodr uses `npm` by default. This can be adjusted by supplying `--yarn` if you want to use yarn instead.

To link your projects globally, you simply issue:

```shell
$ spodr update --link
```

We now make the modules available in the projects.

```shell
$ spodr update --linkdep
```

#### Dependencies

> spodr uses `npm` by default. This can be adjusted by supplying `--yarn` if you want to use yarn instead.

We install all dependencies using:

```shell
$ spodr update --deps
```

Whenever your dependency versions change, you can re-run the command to also install the new dependency versions.

### Daily Tasks

The daily routine starts by pulling all the latest changes into your local work area:

```shell
$ spodr update
```

If you need to get an overview of the state of your work area, you use `spodr status`, which prints a nice table:

```shell
$ spodr status
2017-09-06 16:41:16.219 [INFO  ] (app) Generating Table…
┌────────────────────────────┬────────┬───────┬────────┬───────────┬─────────┬──────────┬─────────┐
│ Name                       │ Branch │ Ahead │ Behind │ Not added │ Deleted │ Modified │ Created │
│ P:\DefinitelyTyped         │ master │ 0     │ 0      │ 0         │ 0       │ 0        │ 0       │
│ P:\stack-generator         │ master │ 0     │ 0      │ 0         │ 0       │ 0        │ 0       │
│ P:\stacktrace-bookmarklet  │ master │ 0     │ 0      │ 0         │ 0       │ 0        │ 0       │
│ P:\stackframe              │ master │ 0     │ 0      │ 0         │ 0       │ 0        │ 0       │
│ P:\Dash-User-Contributions │ master │ 0     │ 0      │ 0         │ 0       │ 0        │ 0       │
│ P:\error-stack-parser      │ master │ 0     │ 0      │ 0         │ 0       │ 0        │ 0       │
│ P:\stacktrace-gps          │ master │ 0     │ 0      │ 0         │ 0       │ 2        │ 0       │
│ P:\stacktrace.js           │ master │ 0     │ 0      │ 0         │ 0       │ 0        │ 0       │
│ P:\www.stacktracejs.com    │ master │ 0     │ 0      │ 0         │ 0       │ 0        │ 0       │
└────────────────────────────┴────────┴───────┴────────┴───────────┴─────────┴──────────┴─────────┘
2017-09-06 16:41:23.854 [NOTICE] (app) Operation finished
```

If you have any unpushed commits, you can push your entire work area using:

```shell
$ spodr push
```

### Rare Tasks
#### check
```shell
$ spodr check
```

Check if any working directory in the work area is dirty.

#### clean
```shell
$ spodr clean
```

Runs `git clean` in every working directory.

#### unartifact
```shell
$ spodr unartifact
```

When massively linking projects with each other, part of the process is to deduplicate. Especially when the task was performed with high concurrency, this can leave artifacts in the `node_modules` of your projects. This is usually indicated by `npm` warnings complaining about missing `package.json` files. The referenced folders are usually empty.

The correct thing to do here is to delete those empty folders. `spodr unartifact` does exactly that for the entire work area.

### `.spodrrc`
If a project contains a `.spodrrc` file, it will be loaded (with `require()`) and may effect how spodr operates:

```js
module.exports = {
	"link" : false,
	"linkDep" : true
}
```

- When `link` is set to false, `npm link` will not be executed for this project.
- When `linkDep` is set to false, globally linked dependencies will not be linked into this project.

Note that spodr also supports a configuration file for the entire work area, which should be named `.spodr.json`. Settings in this file even override `.spodrrc` files. However, this file is rarely used and extensive configuration hierarchies should be avoided if possible.

Other settings configurable are the `name` and `url` for a given repository. Neither are commonly used. You will have to read the source to see how these should be used.
