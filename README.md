# spodr
[![npm version](https://badge.fury.io/js/spodr.svg)](https://badge.fury.io/js/spodr)
[![Build Status (master)](https://travis-ci.org/fairmanager/spodr.svg?branch=master)](https://travis-ci.org/fairmanager/spodr)

dev HEAD: [![Build Status (dev)](https://travis-ci.org/fairmanager/spodr.svg?branch=dev)](https://travis-ci.org/fairmanager/spodr)

## Introduction
spodr is a utility to concurrently manage a work area that contains software projects that are usually:

- using git
- NodeJS-based
- dependent upon each other

These points are however optional. spodr respects non-NodeJS git checkouts or plain directories in the work area and applies tasks as appropriate.

For NodeJS projects, spodr will take over common tasks like linking projects with each other and keeping dependencies up-to-date. For any git checkout, spodr will help with tasks like pulling and pushing commits.

Note that spodr is somewhat opinionated. This is most apparent with the handling of git branches. spodr has the desire to always check out a branch named `dev`, if it exists, unless you're currently on a branch that is neither `dev` nor `master`.

## Getting Started
### Preparing the Work Area

To begin working with spodr, enter an empty folder that will become your work area and clone some of your existing projects.

You can also just take any existing folder that contains your git checkouts. spodr does not maintain any metadata that would designate your work area in any specific way.

spodr also comes with 2 importers that allow you to easily clone all projects from a GitHub organization or a GitLab group. These might require you to provide an API access token. Follow the instructions in the console output.

```shell
$ spodr init --github stacktracejs
```

> By default, spodr will try to run as many processes as possible. This *can* cause problems because multiple `npm` processes have the tendency to saturate any system (which, in turn, triggers further race-condition based bugs in `npm` and `yarn`) and they are prone to failure when running in parallel. Thus, it may be advisable to limit the number of concurrent processes using the `--jobs` argument.

When using your own GitLab server, you have to specify that with `--gitlab-host` or through the `GITLAB_HOST` environment variable.

spodr will check out the default branch as configured server-side. If you want to ensure that you get the `dev` branch, run `spodr update`.

### Dependency Installation

First and foremost, the spodr dependency installation mechnism is **for development only**. Your production deployments still rely on npm or yarn.

spodr can automatically download and install all dependencies of all packages referenced in the entire work area, without relying on external package managers.

When doing so, spodr will always download the highest possible matching version declared as a dependency for each module in the entire tree. In that, it drastically differs from how npm and yarn treat a dependency tree, where there is a desire to deduplicate the tree as much as possible and utilize packages, lower on the tree, that have matching semver ranges. spodr doesn't care if there is a matching package, if the declared semver range would allow for a newer version of the dependency. It will then use the newer version at the deeper branch.

spodr still massively benefits from deduplication, because it treats the entire work area as a single dependency tree.

Additionally, spodr will maintain a package cache local to each work area. This is the cache from where every dependency is linked into the projects. The projects that you would previously link globally are, to maintain their connections, now linked through that cache and don't conflict with modules in other work areas.

Once a package is cached, it is never copied. Every package is linked into the respective `node_modules` folders of each project as required.

#### Root Pinning

```shell
$ spodr install --pin-roots
```

When providing `--pin-roots`, spodr ensures that the *root* project (the one that you have in your work area) is used throughout the entire dependency tree, regardless of any requested semver range. This replaces the previous `update --link --linkdep` operation, but is far more reliable, as consecutive `npm install` runs could break `node_modules` by replacing packages in linked projects.

When you don't provide `--pin-roots`, your root projects are still linked into every location in the dependency tree, where their version matches the requested semver range. This can lead to instances of your root projects being downloaded into the package cache, with versions differing from those in your work area. This commonly happens when you don't have all of your "own" packages in the work area.

Usually, you want to provide `--pin-roots` whenever you install dependencies. **This might become the default in the final implementation and will have to be disabled with `--no-pin-roots`.**

#### Updating the cache

```shell
$ spodr install --update
```

If you want to ensure you have all the latest versions of all dependencies, you can use `--update`. spodr will then ask the registry for every package again to see if newer versions are available and use those.

> You can also just delete parts or the entire package cache at any time and rebuild it from scratch.

Note that others features may imply `--update`, as spodr has a very strong desire to ensure that all packages are always used at the most recent version possible. If you want to prevent a certain package version from being used, utilize version locking.

#### Version Locking

When spodr generates the dependency tree, you can instruct it to replace certain versions of packages with different versions, thus, *lock* the dependency into a given version.

When you lock a version, it will be locked throughout the entire global dependency tree, regardless of the location it exists in.

##### Example

```json
"locks": {
	"chai-as-promised": {
		"*": "5.3.0"
	},
	"eslint": {
		"^5.8.0": "5.8.0"
	},
	"uglify-js": {
		"^3.0.0": "3.4.8"
	}
}
```

This `.spodrlock.json` would cause all versions of `chai-as-promised` to be locked down to version 5.3.0. The versions of `eslint` and `uglify-js` would be replaced as well, if they'd match the given version ranges. Multiple version ranges could be defined for a module.

#### Peering

A module can request to find a *peer* dependency in the dependency tree. This means that, while it doesn't directly want to depend on a module, it wants to be able to find a module of the given name and version in the tree. Usually, this is produced by a depending module declaring the dependency itself. This mechanism is controlled through the `peerDependencies` in the `package.json`.

This mechanism is important to resolve issues in other dependency managers. In spodr, you'd always want every single package to declare every single dependency it has. However, that is not being done, because people usually don't use spodr.

When npm or yarn see a peer dependency being declared, they warn you if your package higher up in the tree doesn't depend on the requested package. If the package is depended upon, the package is installed high up in the tree and will be found through module resolution.

When spodr sees a peer dependency being declared, it links the best possible version directly into the `node_modules` of the requesting package.

Additionally, peering can be controlled through the `.spodrlock.json`. This is required when modules blindly assume a specific dependency tree structure and just `require()` a module by name, even through they neither directly or peer depend on it. This works in other package managers, because they register packages always as high up as possible in the isolated `node_modules` folder of every single module. spodr doesn't do that for performance reasons. So you have to declare a peering manually to ensure a given module is available as a dependency of another module.

##### Example

```json
"peering": {
	"eslint": {
		"*": {
			"^eslint-plugin-.*$": "*"
		}
	},
	"karma": {
		"*": {
			"^karma-.*$": "*"
		}
	},
	"karma-chai-as-promised": {
		"0.1.2": {
			"^chai-as-promised$": "5.3.0"
		}
	},
	"karma-mocha": {
		"~1.3.0": {
			"^mocha$": "5.2.0"
		}
	}
}
```

In this peering configuration, multiple dependency issues are being resolved:

1. `eslint` will, in every version found in the tree, declare a dependency to every ESlint plugin (where the module name matches `^eslint-plugin-.*$`) in any version that is available. If a plugin is available in multiple versions, the first one found is selected. If that is undesireable, a more specific version map must be defined.

2. A similar setup is being made for `karma`, so it can load Karma plugins by name.

3. Because `chai-as-promised` can not be used in Karma in later versions, we're peering `karma-chai-as-promised` with `chai-as-promised` in version 5.3.0. Note that this can still not lead to the desire result. `karma-chai-as-promised` has an existing peer dependency configured that is satisfied by _any_ version of `chai-as-promised`. If that was already resolved, spodr will not replace it, unless you lock down the version through version locking (see above).

4. `karma-mocha` in a specific version being used is also peered with `mocha` to allow it to load the dependency by name.

#### Key conflicts with common package managers

1. Packages are **always** resolved to the highest possible version matching the semver range. This is true for the entire dependency tree.

2. Packages are **never** copied, they are *linked* into `node_modules`.

3. Because of 1. and 2., when a module requires another module by name, but the containing package did not declare that package as a dependency, it will never be found.
   For example: Consider you're using `eslint` and you tell it to use `eslint-plugin-promise`, then `eslint` will `require( "eslint-plugin-promise" )`, but it will not find it, because `eslint-plugin-promise` is not a dependency of `eslint`.
   spodr resolves this by applying some magic if it detects plugin architectures in the tree. It will then see which packages require both `eslint` *and* `eslint-plugin-promise` and register `eslint-plugin-promise` as a peer dependency of `eslint`.
   In that process, spodr will detect which versions of the plugin and host were used and register the peer only for that combination.

4. Because of 3., when you use a package that uses a package that uses a plugin, you can run into unexpected version conflicts, which you need to resolve manually.
   For example: Consider you're using `gulp-plugin-eslint`, which will read your ESLint configuration and runs `eslint` for you. However, `gulp-plugin-eslint` could require a different version (or semver range) of `eslint` than your project.
   Then `gulp-plugin-eslint` would use an `eslint` that doesn't have `eslint-plugin-promise`, because *that* is only linked with the version *you* are depending on (phew).
   To resolve this, you can:

   - clone a copy of `eslint` into your work area and use that throughout the entire work area (`--pin-roots`)
   - use the exact same semver range for `eslint` that `gulp-plugin-eslint` declares.

5. This also means that, if a package relies on having another package in the tree, but it does not explicitly declare this through a `peerDependency`, it will not be found.

While these conflicts can be viewed as shortcomings, the opinion with which this dependency management was developed is that this way enforces stricter dependency declarations and that that is actually preferable.

Also note that this behavior is dictated by the NodeJS module loader behavior. NodeJS always resolves modules to their actual path on disk, not the linked location (although this can apparently be controlled through the [`NODE_PRESERVE_SYMLINKS`](https://nodejs.org/api/cli.html#cli_node_preserve_symlinks_1) environment variable). For spodr maintained work areas, this is the location in the package cache. Because packages are stored in the cache with a hashed module name, they can never find any peers by name.

### Linking (not recommended)

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

### Dependencies (not recommended)

> spodr uses `npm` by default. This can be adjusted by supplying `--yarn` if you want to use yarn instead.

We install all dependencies using:

```shell
$ spodr update --deps
```

Whenever your dependency versions change, you can re-run the command to also install the new dependency versions.

## Daily Tasks

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
`spodr status` also calls `git fetch --all` in every repo to show you the latest stats against your remote.
You can use `spodr status --skip-git` to *not* fetch the latest changes. `spodr peek` is an alias for that command.

If you have any unpushed commits, you can push your entire work area using:

```shell
$ spodr push
```

To switch all checkouts to a specific branch, use `spodr checkout`:
```shell
$ spodr checkout --master
$ spodr checkout --branch=master
```

### Rare Tasks
#### check
```shell
$ spodr check
```

Check if any working directory in the work area is dirty.

### clean
```shell
$ spodr clean
```

Runs `git clean` in every working directory.

### unartifact
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
