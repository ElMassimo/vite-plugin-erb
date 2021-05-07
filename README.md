<h2 align='center'><samp>vite-plugin-erb</samp></h2>

<p align='center'>Use ERB files in <samp>Vite.js</samp> projects with a Ruby backend</p>

<p align='center'>
  <a href='https://www.npmjs.com/package/vite-plugin-erb'>
    <img src='https://img.shields.io/npm/v/vite-plugin-erb?color=222&style=flat-square'>
  </a>
  <a href='https://github.com/ElMassimo/vite-plugin-erb/blob/main/LICENSE.txt'>
    <img src='https://img.shields.io/badge/license-MIT-blue.svg'>
  </a>
</p>

<br>

[plugin]: https://github.com/ElMassimo/vite-plugin-erb
[migration]: https://vite-ruby.netlify.app/guide/migration.html#migrating-to-vite
[vite.js]: http://vitejs.dev/
[rails-erb-loader]: https://github.com/usabilityhub/rails-erb-loader
[define]: https://vitejs.dev/config/#define
[Vite Ruby]: https://vite-ruby.netlify.app/config/#source-maps-%F0%9F%97%BA
[sprockets]: https://github.com/rails/sprockets
[jsfromroutes]: https://github.com/ElMassimo/js_from_routes
[spring]: https://github.com/rails/spring

## Disclaimer ⚠️

This library is intended for __legacy projects__—please do not use it on new projects.

Using ERB with JS and CSS files can lead to a fragile setup where your frontend assets
are entangled with your backend setup, making it very hard to migrate to
different tooling or frameworks.

The goal of this library is to ease out the transition as you __gradually remove__ your `.js.erb` files.

If you need to share constants or values between the backend and the frontend,
a safer and more performant approach is to instead [generate JS or TypeScript from Ruby][jsfromroutes]
and import it as usual (or viceversa).

## Why? 🤔

When migrating to [Vite.js] from [sprockets] or similar asset pipelines, it's
not unusual to have `.erb` files that depend on the Ruby runtime to be rendered.

This plugin allows Vite.js to understand `.erb` files, and render them in the
context of your Ruby application.

It provides the same functionality as <kbd>[rails-erb-loader]</kbd>, but for Vite.js.

## Installation 💿

Install the package as a development dependency:

```bash
npm i -D vite-plugin-erb # yarn add -D vite-plugin-erb
```

and then add the plugin to your `vite.config.ts` file:

```js
import { defineConfig } from 'vite'
import Erb from 'vite-plugin-erb'

export default defineConfig({
  plugins: [
    Erb(),
  ],
})
```

## Usage 🚀

Once the plugin is installed, you should be able to start importing `.erb` files.

```js
// app/frontend/constants.js.erb

export const railsEnv = <%= Rails.env.to_json %>
```

```js
import { railsEnv } from '~/constants.js.erb'

console.log(`Running in ${railsEnv}`)
```

## Configuration ⚙️

If things are not working out of the box, you might need to tweak some the
following settings.

For example:

```js
plugins: [
  Erb({
    engine: 'erb',
    runner: 'ruby ./boot.rb',
    env: { RACK_ENV: process.env.NODE_ENV },
    extendEnv: false,
    timeout: 5000,
  }),
],
```

### `engine`

The ERB template engine to use. `erubi`, `erubis` and `erb` are supported.

You can manually specify which one to use if needed, but they will be detected automatically.

### `runner`

The command to run the internal ruby script.

If `bin/rails` is detected, Rails runner will be used, giving you access to the
application environment.

You may provide `ruby ./boot.rb` or something similar if using other frameworks.

### `env`

Additional environment variables to be passed to runner. Defaults to `process.env`.

### `extendEnv`

Set to false if you want to override `process.env` instead when providing the <kbd>env</kbd> property.

### `timeout`

Te Ruby process will be sent a termination signal if it doesn't return a result
under the specified timeout in millis. Defaults to `10000`.

## A note about [spring] 🌺

By default `DISABLE_SPRING: '1'` is set in <kbd>env</kbd> because if the
[spring] client is started from Node.js the Ruby renderer process would never finish.

This makes the rendering process significantly slower, specially in large apps.

You may provide `env: { DISABLE_SPRING: '0' }` to re-enable [spring], but make
sure to run `bin/rails runner ''` before starting the Vite dev server to prevent
this issue, or reload the page after the first visit (which would timeout).

## Acknowledgements

- [rails-erb-loader]: Provided the foundation for this library. Thanks!

## License

This library is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
