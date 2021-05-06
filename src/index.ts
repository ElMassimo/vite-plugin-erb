import { parse as parseQuery } from 'querystring'
import { join } from 'path'
import { promises as fs } from 'fs'
import execa from 'execa'
import createDebugger from 'debug'

import type { Plugin } from 'vite'

type Engine = 'erubi' | 'erubis' | 'erb'

const debug = createDebugger('vite-plugin-erb')

interface Options {
  /**
   * ERB Template engine, "erubi", "erubis" and "erb" are supported.
   * @default 'erubi' if available, fallback to 'erb'
   */
  engine?: Engine
  /**
   * Command to run Ruby scripts.
   * @default auto-detected
   */
  runner?: string
  /**
   * Additional environment variables to be passed to runner.
   * NOTE: Set extendEnv: false to avoid extending `process.env`.
   */
  env?: Record<string, string>
  /**
   * Set to false if you don't want to extend the environment variables when providing the env property.
   * @default true
   */
  extendEnv?: boolean
  /**
   * If timeout is greater than 0, the Ruby process will be sent a termination
   * signal if it doesn't return a result under the specified time in millis.
   * @default 10000
   */
  timeout?: number
}

// Because the child Ruby process can output warnings or other messages, we
// add a delimiter to the output of the renderer to cleanly extract it.
const outputDelimiter = '__VITE_ERB_RESULT__'
const renderedOutputRegex = new RegExp(`${outputDelimiter}([\\s\\S]*?)${outputDelimiter}`, 'm')

// Internal: A small Ruby script that renders the ERB template and encloses the
// output with delimiters.
const rendererPath = join(__dirname, '../src/renderer.rb')

// Internal: Detects a Rails installation in order to use the bin/rails binstub.
async function detectRunner (root: string) {
  try {
    await fs.access(join(root, 'bin/rails'))
    return 'ruby bin/rails runner'
  }
  catch {
    return 'ruby'
  }
}

// Internal: Creates a child Ruby process to which
async function renderErbFile (code: string, id: string, options: Options, cwd: string) {
  const { engine = '', runner = '', ...execOptions } = options
  try {
    debug(`rendering ${id}`)
    const [cmd, ...cmdArgs] = runner.split(' ')
    const args = [...cmdArgs, rendererPath, outputDelimiter, engine].filter(x => x)
    const rubyProcess = execa(cmd, args, { input: code, cwd, timeout: 10000, killSignal: 'SIGKILL', ...execOptions })

    const { stdout } = await rubyProcess
    const matches = stdout.match(renderedOutputRegex)
    if (!matches) throw new Error(`No output when rendering ${id}. Is the file valid?`)

    debug(`rendered ${id}`, { code: matches[1] })
    return matches[1]
  }
  catch (error) {
    debug(`failed to render ERB file ${id}`, error)
    throw error
  }
}

export interface ErbQuery {
  erb?: boolean
}

function parseId(id: string) {
  const [filename, rawQuery] = id.split(`?`, 2)
  const query = parseQuery(rawQuery) as ErbQuery
  if (query.erb !== undefined) query.erb = true
  return { filename, query }
}

/**
 * Renders .erb files in the context of a Ruby application.
 */
export default function ErbPlugin (options: Options = {}): Plugin {
  let root: string
  return {
    name: 'erb-plugin',
    enforce: 'pre',
    async configResolved (config) {
      root = process.env.VITE_RUBY_ROOT || config.root
      if (!options.runner) options.runner = await detectRunner(root)
    },
    async transform (code, id) {
      const { filename, query } = parseId(id)
      if (query.erb || filename.endsWith('.erb') || filename.includes('.erb.')) {
        debug(`transforming ${filename}`, { query })
        return {
          code: await renderErbFile(code, id, options, root),
          map: null,
        }
      }
    },
  }
}
