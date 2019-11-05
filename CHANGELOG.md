# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [5.0.0](https://github.com///compare/v4.0.3...v5.0.0) (2019-11-05)


### ⚠ BREAKING CHANGES

* Fixes retry strategy not making HTTP calls, removes Promise specific retry policy and relies on observable conversion

### Bug Fixes

* Fixes retry strategy not making HTTP calls, removes Promise specific retry policy and relies on observable conversion ([79f7341](https://github.com///commit/79f734109a73c6e53ec9125aee419641ab1b935e))

### [4.0.3](https://github.com///compare/v4.0.2...v4.0.3) (2019-10-31)


### Bug Fixes

* use patch callback for patch method ([2c6e46a](https://github.com///commit/2c6e46a9cf2350a0b796061f8dd00ab17244719c))

### [4.0.2](https://github.com///compare/v4.0.1...v4.0.2) (2019-10-24)


### Bug Fixes

* fixes retry policy for observables executed through http service, makes error handling more robust ([4696831](https://github.com///commit/469683196094cc789be18f68a809247a993966ca))

### [4.0.1](https://github.com///compare/v4.0.0...v4.0.1) (2019-10-24)


### Bug Fixes

* handles exception that might occur in retry service + adds checks for existence of original error to prevent exception for unknown objects ([8cc08c1](https://github.com///commit/8cc08c194cd743baf612286e895ca56025fa9729))

## [4.0.0](https://github.com///compare/v3.2.1...v4.0.0) (2019-10-24)


### ⚠ BREAKING CHANGES

* Refactors retry policy. Retry policy now uses jitter in combination with exponential wait time and changes configuration from retry attemps to max. allowed wait time

### Features

* Refactors retry policy. Retry policy now uses jitter in combination with exponential wait time and changes configuration from retry attemps to max. allowed wait time ([ba4d439](https://github.com///commit/ba4d43948be800a6ce52ac3e6643acdaae056c58))
* takes 'retry-after' header into consideration when retrying requests, adds ability to disable jitter ([d84c021](https://github.com///commit/d84c021fd1ffa9d7c67308e24da6a131701334f7))

### [3.2.1](https://github.com///compare/v3.2.0...v3.2.1) (2019-10-23)


### Bug Fixes

* makes fake headers optional in test http service ([400eeaa](https://github.com///commit/400eeaadef2c381cbd45caf65326b6b9b9906622))

## [3.2.0](https://github.com///compare/v3.1.0...v3.2.0) (2019-10-23)


### Features

* extends TestHttpService with the ability to set fake headers & status code ([e838e27](https://github.com///commit/e838e279133f116c399b0862c64b4179d4ace1aa))

## [3.1.0](https://github.com///compare/v3.0.0...v3.1.0) (2019-10-15)


### Features

* adds ability to pass axios request config to client initialization ([fc6a18b](https://github.com///commit/fc6a18b087ef9b37dc46add8045a7e791321d0ba))

## [3.0.0](https://github.com///compare/v2.0.0...v3.0.0) (2019-10-14)
