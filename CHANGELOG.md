## [1.1.3](https://github.com/ElMassimo/vite-plugin-erb/compare/v1.1.2...v1.1.3) (2025-04-23)


### Bug Fixes

* handle plugins that have an object transform with `handler` (closes [#5](https://github.com/ElMassimo/vite-plugin-erb/issues/5)) ([0aba156](https://github.com/ElMassimo/vite-plugin-erb/commit/0aba156341d8e937d920741009df093058dbcb62))



## [1.1.2](https://github.com/ElMassimo/vite-plugin-erb/compare/v1.1.1...v1.1.2) (2022-07-14)


### Bug Fixes

* esm incompatibility with __dirname ([1c6d556](https://github.com/ElMassimo/vite-plugin-erb/commit/1c6d556da06a3ac9b6d650ed4f8e7150b7de5c1f))



## [1.1.1](https://github.com/ElMassimo/vite-plugin-erb/compare/v1.1.0...v1.1.1) (2022-07-14)


### Features

* update peer dependencies to support Vite 3 ([21e11b2](https://github.com/ElMassimo/vite-plugin-erb/commit/21e11b29f0667526962855b4b835b3d01ba65eee))



# [1.1.0](https://github.com/ElMassimo/vite-plugin-erb/compare/v1.0.1...v1.1.0) (2022-01-05)


### Bug Fixes

* default export when using `"type": "module"` vite project ([32447f2](https://github.com/ElMassimo/vite-plugin-erb/commit/32447f24ef757c894cf690228779fb4fb138edbb))



## [1.0.1](https://github.com/ElMassimo/vite-plugin-erb/compare/v1.0.0...v1.0.1) (2021-09-21)


### Bug Fixes

* avoid running importAnalysisPlugin to enable imports from .js.erb (close [#1](https://github.com/ElMassimo/vite-plugin-erb/issues/1)) ([d556196](https://github.com/ElMassimo/vite-plugin-erb/commit/d556196a35f1dac16923ef72625978105ed97f0d))



# 1.0.0 (2021-05-07)


### Bug Fixes

* Disable spring by default, users can opt-in but the first time the process will never finish. ([9f498fc](https://github.com/ElMassimo/vite-plugin-erb/commit/9f498fc22baabc25615d21d334187c4ef8da80c3))
* Using load has the downside of requiring a server restart ([0e87746](https://github.com/ElMassimo/vite-plugin-erb/commit/0e87746ec534356b34e8c1250cfa45f1ffd655c5))


### Features

* Add `debug` setting to allow the renderer to output more information ([18a96af](https://github.com/ElMassimo/vite-plugin-erb/commit/18a96af1079b3ba5d799fde630a7a1b95272d84c))
* Create plugin to render ERB files in Ruby ([3042390](https://github.com/ElMassimo/vite-plugin-erb/commit/3042390af044c666a718dff3e0cc3c4f27cc9910))



