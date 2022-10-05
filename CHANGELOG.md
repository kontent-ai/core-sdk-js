# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [10.1.1](https://github.com/kontent-ai/kontent-core-js/compare/v10.1.0...v10.1.1) (2022-10-05)

## [10.1.0](https://github.com/kontent-ai/kontent-core-js/compare/v10.0.0...v10.1.0) (2022-10-05)


### Features

* use es6 instead of es5 ([623efc2](https://github.com/kontent-ai/kontent-core-js/commit/623efc245b19a1d31d2aa381ed03a9d104824582))

## [10.0.0](https://github.com/kontent-ai/kontent-core-js/compare/v10.0.0-0...v10.0.0) (2022-07-14)

* This release reflects only new Kontent-ai branding and no code changes.

## [10.0.0-0](https://github.com/kontent-ai/kontent-core-js/compare/v9.5.0...v10.0.0-0) (2022-07-14)

## [9.5.0](https://github.com/Kentico/kontent-core-js/compare/v9.4.0...v9.5.0) (2022-03-23)


### Features

* updates all deps ([ae2232c](https://github.com/Kentico/kontent-core-js/commit/ae2232cb4dfeb11ba76b3cd82fd67180610ae001))

## [9.4.0](https://github.com/Kentico/kontent-core-js/compare/v9.3.0...v9.4.0) (2021-11-29)


### Features

* updates deps ([dcfaee3](https://github.com/Kentico/kontent-core-js/commit/dcfaee311db202ae522fcf0200597e1bfa31eaa8))

## [9.3.0](https://github.com/Kentico/kontent-core-js/compare/v9.2.0...v9.3.0) (2021-11-02)


### Features

* adds ability to turn of error logging to console ([535fddc](https://github.com/Kentico/kontent-core-js/commit/535fddc3aefcecc9296625dec6383ac48175a6e0))

## [9.2.0](https://github.com/Kentico/kontent-core-js/compare/v9.1.0...v9.2.0) (2021-09-24)


### Features

* updates deps ([c42b40a](https://github.com/Kentico/kontent-core-js/commit/c42b40a346f832e89acdfa1b9f5d91b5482ea116))

## [9.1.0](https://github.com/Kentico/kontent-core-js/compare/v9.0.1...v9.1.0) (2021-08-12)


### Features

* updates dependencies ([2e62c07](https://github.com/Kentico/kontent-core-js/commit/2e62c077691c828e600dd69e32d2969b2cd75137))


### Bug Fixes

* removes console log used for test purposes ([bcb70d9](https://github.com/Kentico/kontent-core-js/commit/bcb70d90aa393a83b49e72e7e3363ae6b32cff68))

### [9.0.1](https://github.com/Kentico/kontent-core-js/compare/v9.0.0...v9.0.1) (2021-06-15)


### Bug Fixes

* fixes retry strategy return value, adds console info message when retrying request ([ab229f2](https://github.com/Kentico/kontent-core-js/commit/ab229f273ed2bd6c4982b94240c23000503078c2))

## [9.0.0](https://github.com/Kentico/kontent-core-js/compare/v8.1.0...v9.0.0) (2021-06-09)


### Features

* adds retry strategy details to response, adds more tests ([a8c2008](https://github.com/Kentico/kontent-core-js/commit/a8c2008638524c354be98643218626a3d244a3f5))
* adds support for cancelling requests via custom proxy cancel token ([2c48113](https://github.com/Kentico/kontent-core-js/commit/2c4811367111c0bdecae4615d5796b73c9287924))
* improves TestHttpService & adds http service spec ([9534ca5](https://github.com/Kentico/kontent-core-js/commit/9534ca5bb9e320f3d766ce9b64c933f1ad0914d3))
* refactors http service to use async & promises, removes rxjs dependency, reworks retry strategy ([fc11a6f](https://github.com/Kentico/kontent-core-js/commit/fc11a6fae557ce2a112fc237faa24edb344e99ba))
* updates deps ([d4f4c2a](https://github.com/Kentico/kontent-core-js/commit/d4f4c2a38d808898ff3984530c031cd3d2703030))


### Bug Fixes

* cjs script ([ede96c2](https://github.com/Kentico/kontent-core-js/commit/ede96c2cc55d70468212fb69332a8be6fd8770dc))
* fixes path to cjs module ([e0570b3](https://github.com/Kentico/kontent-core-js/commit/e0570b3fd5c3c7bf0e3166eb642f78980d3fb3e1))
* fixes retry attempt index in console ([83e053d](https://github.com/Kentico/kontent-core-js/commit/83e053db21a4871741e980de2166d68b08f50946))

## [8.1.0](https://github.com/Kentico/kontent-core-js/compare/v8.0.0...v8.1.0) (2021-01-08)


### Features

* updates deps ([95b8da4](https://github.com/Kentico/kontent-core-js/commit/95b8da4bf439607197961f4cb8ddce5811fe7f2f))

## [8.0.0](https://github.com/Kentico/kontent-core-js/compare/v7.2.0...v8.0.0) (2020-11-23)


### ⚠ BREAKING CHANGES

* updates all dependecies, uses Axios types directly instead of custom type proxies

### Features

* updates all dependecies, uses Axios types directly instead of custom type proxies ([a9f494c](https://github.com/Kentico/kontent-core-js/commit/a9f494c212f06f6da6ab8edf04fb0cc48120d063))

## [7.2.0](https://github.com/Kentico/kontent-core-js/compare/v7.1.0...v7.2.0) (2020-09-25)


### Features

* adds 'isAxiosError' configuration option to 'TestHttpService' ([5b55751](https://github.com/Kentico/kontent-core-js/commit/5b557517cf150fd58ce5c801083020e1c3e9dd52))

## [7.1.0](https://github.com/Kentico/kontent-core-js/compare/v7.0.2...v7.1.0) (2020-08-25)


### Features

* refactors IQueryParameter to allow value-less params + adds tests for urlHelper ([b061e2e](https://github.com/Kentico/kontent-core-js/commit/b061e2e6c4b5a5300e163dcdfc71bff31169c539))

### [7.0.2](https://github.com/Kentico/kontent-core-js/compare/v7.0.1...v7.0.2) (2020-07-27)


### Bug Fixes

* removes generic Error parameters ([71ffa32](https://github.com/Kentico/kontent-core-js/commit/71ffa32e8e4b11a9b1b0283d48166417faa4d8ad))

### [7.0.1](https://github.com/Kentico/kontent-core-js/compare/v7.0.0...v7.0.1) (2020-07-27)


### Bug Fixes

* removes base kontent error models & mapper ([0ac082b](https://github.com/Kentico/kontent-core-js/commit/0ac082b5d659ec7bdf94690855b8d8f43861e093))

## [7.0.0](https://github.com/Kentico/kontent-core-js/compare/v6.0.0...v7.0.0) (2020-07-27)


### ⚠ BREAKING CHANGES

* removes error mapping from core database. Errors should be mapped in each sdk directly.

### Features

* removes error mapping from core database. Errors should be mapped in each sdk directly. ([b645633](https://github.com/Kentico/kontent-core-js/commit/b645633092893a3254f5c5ec06fad92ad17ea640))
* udpates dependencies ([325d4ca](https://github.com/Kentico/kontent-core-js/commit/325d4ca8fc28f478aca1cae3c04a4d7cf0cb69d8))

## [6.0.0](https://github.com///compare/v5.0.1...v6.0.0) (2020-01-07)


### ⚠ BREAKING CHANGES

* refactors retry strategy to allow developers define what errors should or should not be retried using new 'canRetryError' configuration option. Separates retryStrategy options from HTTP query configuration to simplify mapping and increase visibility. Lastly, new retry strategy allows specifying number of maximum retry attempts in combination with cumulative wait time.

### Features

* refactors retry strategy to allow developers define what errors should or should not be retried using new 'canRetryError' configuration option. Separates retryStrategy options from HTTP query configuration to simplify mapping and increase visibility. Lastly, new retry strategy allows specifying number of maximum retry attempts in combination with cumulative wait time. ([779097d](https://github.com/Kentico/kontent-core-js/commit/779097d21c3724ef172e0e8ee189d655e31036e4))
* updates all dependencies to latest versions ([8a8e87a](https://github.com/Kentico/kontent-core-js/commit/8a8e87a5186503e381aeb40f63720ceaa7d7b39e))

### [5.0.1](https://github.com///compare/v5.0.0...v5.0.1) (2019-11-20)


### Bug Fixes

* removes test warn error message ([b3fbe08](https://github.com/Kentico/kontent-core-js/commit/b3fbe08ed32708853bfac011705d93321007e3ff))

## [5.0.0](https://github.com///compare/v4.0.3...v5.0.0) (2019-11-05)


### ⚠ BREAKING CHANGES

* Fixes retry strategy not making HTTP calls, removes Promise specific retry policy and relies on observable conversion

### Bug Fixes

* Fixes retry strategy not making HTTP calls, removes Promise specific retry policy and relies on observable conversion ([79f7341](https://github.com/Kentico/kontent-core-js/commit/79f734109a73c6e53ec9125aee419641ab1b935e))

### [4.0.3](https://github.com///compare/v4.0.2...v4.0.3) (2019-10-31)


### Bug Fixes

* use patch callback for patch method ([2c6e46a](https://github.com/Kentico/kontent-core-js/commit/2c6e46a9cf2350a0b796061f8dd00ab17244719c))

### [4.0.2](https://github.com///compare/v4.0.1...v4.0.2) (2019-10-24)


### Bug Fixes

* fixes retry policy for observables executed through http service, makes error handling more robust ([4696831](https://github.com/Kentico/kontent-core-js/commit/469683196094cc789be18f68a809247a993966ca))

### [4.0.1](https://github.com///compare/v4.0.0...v4.0.1) (2019-10-24)


### Bug Fixes

* handles exception that might occur in retry service + adds checks for existence of original error to prevent exception for unknown objects ([8cc08c1](https://github.com/Kentico/kontent-core-js/commit/8cc08c194cd743baf612286e895ca56025fa9729))

## [4.0.0](https://github.com///compare/v3.2.1...v4.0.0) (2019-10-24)


### ⚠ BREAKING CHANGES

* Refactors retry policy. Retry policy now uses jitter in combination with exponential wait time and changes configuration from retry attemps to max. allowed wait time

### Features

* Refactors retry policy. Retry policy now uses jitter in combination with exponential wait time and changes configuration from retry attemps to max. allowed wait time ([ba4d439](https://github.com/Kentico/kontent-core-js/commit/ba4d43948be800a6ce52ac3e6643acdaae056c58))
* takes 'retry-after' header into consideration when retrying requests, adds ability to disable jitter ([d84c021](https://github.com/Kentico/kontent-core-js/commit/d84c021fd1ffa9d7c67308e24da6a131701334f7))

### [3.2.1](https://github.com///compare/v3.2.0...v3.2.1) (2019-10-23)


### Bug Fixes

* makes fake headers optional in test http service ([400eeaa](https://github.com/Kentico/kontent-core-js/commit/400eeaadef2c381cbd45caf65326b6b9b9906622))

## [3.2.0](https://github.com///compare/v3.1.0...v3.2.0) (2019-10-23)


### Features

* extends TestHttpService with the ability to set fake headers & status code ([e838e27](https://github.com/Kentico/kontent-core-js/commit/e838e279133f116c399b0862c64b4179d4ace1aa))

## [3.1.0](https://github.com///compare/v3.0.0...v3.1.0) (2019-10-15)


### Features

* adds ability to pass axios request config to client initialization ([fc6a18b](https://github.com/Kentico/kontent-core-js/commit/fc6a18b087ef9b37dc46add8045a7e791321d0ba))

## [3.0.0](https://github.com///compare/v2.0.0...v3.0.0) (2019-10-14)
