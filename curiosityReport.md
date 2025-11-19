# Curiosity Report: What specifically happens when the `npm install` command is run?

## 1. Overview
- I've run npm install many times but I often don't really stop to think about what it's actually doing
- This is important for QA/DevOps because dependency control is crucial in things like CI reliability and tests

## 2. Background Concepts
### Node Module Resolution
This is the algorithm Node.js uses to determine where a required module is and which version should be loaded when code like require() or import is used

### Versioning
As discussed in class, this determines the compatibility of package and other versions. In this case the format is major.minor.patch, and the compatibility of these can be confirmed

### Lockfiles
This is where the exact package versions and dependency relationships are kept, ensuring things like CI pipelines use the same versions of packages every time. In the case of npm, this is the package-lock.json file

## 3. Process for npm install

### Steps
1. Reads package.json and existing package-lock.json if it exists
2. Resolves versions using semver (semantic versioning) rules. 
3. Builds a full dependency tree.
4. Downloads packages into a cache.
5. Create node_modules (this is where external packages are actually stored)
6. Run lifecycle scripts

### Exceptions
- When there is no existing lockfile, npm must create a new dependency tree and then write a new package-lock.json based on the latest matching versions . Because of this, versions could end up being different
- When package.json has changed, npm install needs to update the lockfile to reflect any new/changed dependencies and install updated packages. It attempts to keep as much of the lockfile as possible the same.
- When the folder node_modules already exists, npm verifies that everything matches, and installs/updates any incorrect packages if it doesn’t


##  Comparison to Alternative Managers (yarn)

### Yarn
- Yarn is an alternate package manager with the purpose of making install performance better with techniques like enhanced caching. Its own lockfile is yarn.lock.
- https://yarnpkg.com/getting-started


## 6. Experiment

### Time Comparison
Node v22.11.0
Commands:
- `rm -rf node_modules package-lock.json`
- `time npm install`

- `rm -rf node_modules package-lock.json yarn.lock`
-`yarn install`
-`rm -rf node_modules`
-`time yarn install`

| Tool    | Run Type      | Time (s) | Notes                                      |
|-------------------|--------------|---------:|--------------------------------------------|
| npm install       | fresh        | 22.25    | No lockfile, full resolution and install     |
| yarn install      | fresh        | 27.25    | Generated `yarn.lock`, full install        |
| yarn install      | cached       | 4.12     | Existing `yarn.lock`, reused cache         |


## 7. Takeaways

Dependency installation is crucial in impacting the reliability and performance of pipelines, something that is especially important for this class and our CI pipelines.
The value of caching and how this can drastically reduce install times
The necessity of lockfiles in ensuring version cohesion across systems


## 8. References
- npm Documentation: https://docs.npmjs.com/cli/v10/commands/npm-install
- Yarn documentation: https://classic.yarnpkg.com/en/docs/install
-There are also others like pnpm: https://pnpm.io/motivation

