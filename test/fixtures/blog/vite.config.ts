import { defineConfig } from 'vite'
import ERB from 'vite-plugin-erb'
import RubyPlugin from 'vite-plugin-ruby'

export default defineConfig({
  plugins: [
    ERB({ env: { RACK_ENV: process.env.VITE_RUBY_MODE } }),
    RubyPlugin(),
  ],
})
