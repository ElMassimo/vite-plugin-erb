import { parse as parseQuery } from 'querystring'
import { join, relative } from 'path'
import { accessSync, createReadStream } from 'fs'
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
function detectRunner (root: string) {
  try {
    accessSync(join(root, 'bin/rails'))
    return 'ruby bin/rails runner'
  }
  catch {
    return 'ruby'
  }
}

// Internal: Creates a child Ruby process to which
async function renderErbFile (cwd: string, filename: string, options: Options) {
  const { engine = '', runner = '', ...execOptions } = options
  const path = relative(cwd, filename)
  try {
    const [cmd, ...cmdArgs] = runner.split(' ')
    const args = [...cmdArgs, rendererPath, outputDelimiter, engine].filter(x => x)
    const code = createReadStream(filename, { encoding: 'utf-8' })

    debug(`rendering ${path}`)
    const rubyProcess = execa(cmd, args, { input: code, cwd, timeout: 10000, killSignal: 'SIGKILL', ...execOptions })
    const { stdout } = await rubyProcess

    const matches = stdout.match(renderedOutputRegex)
    if (!matches) throw new Error(`No output when rendering ${filename}. Is the file valid?`)

    debug(`rendered ${path}`)
    return matches[1]
  }
  catch (error) {
    debug(`failed to render ERB file ${path}`, error)
    throw error
  }
}

type ErbQuery = ReturnType<typeof parseQuery> & { erb?: boolean }

function parseId (id: string) {
  const [filename, rawQuery] = id.split('?', 2)
  const query = parseQuery(rawQuery) as ErbQuery
  if (query.erb !== undefined || filename.endsWith('.erb')) query.erb = true
  return { filename: filename.split('.erb', 2)[0], query }
}

/**
 * Renders .erb files in the context of a Ruby application.
 */
export default function ErbPlugin (options: Options = {}): Plugin {
  let root: string
  return {
    name: 'erb-plugin',
    enforce: 'pre',
    configResolved (config) {
      root = process.env.VITE_RUBY_ROOT || config.root
      if (!options.runner) options.runner = detectRunner(root)
      debug(`running renderer with '${options.runner}'`)
    },
    resolveId (id) {
      const { filename, query } = parseId(id)
      if (query.erb) return `${filename.split('.erb', 2)[0]}?erb`
    },
    async load (id) {
      const { filename, query } = parseId(id)
      if (query.erb) return await renderErbFile(root, `${filename}.erb`, options)
    },
  }
}
