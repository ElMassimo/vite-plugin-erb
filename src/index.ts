import { parse as parseQuery } from 'querystring'
import { join, dirname, relative, isAbsolute } from 'path'
import { fileURLToPath } from 'url'
import { accessSync } from 'fs'
import execa from 'execa'
import createDebugger from 'debug'
import picomatch from 'picomatch'

import type { Plugin } from 'vite'
import type { ObjectHook } from 'rollup'

type PluginFilter = (input: string) => boolean
type TransformHookFilter = (id: string, code: string) => boolean
type StringFilter<Value = string | RegExp> =
| Value
| Array<Value>
| {
  include?: Value | Array<Value>
  exclude?: Value | Array<Value>
}
type NormalizedStringFilter = {
  include?: Array<string | RegExp>
  exclude?: Array<string | RegExp>
}

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
   * @default 0
   */
  timeout?: number
}

const _dirname = typeof __dirname === 'undefined'
  ? dirname(fileURLToPath(import.meta.url))
  : __dirname

// Because the child Ruby process can output warnings or other messages, we
// add a delimiter to the output of the renderer to cleanly extract it.
const outputDelimiter = '__VITE_ERB_RESULT__'
const renderedOutputRegex = new RegExp(`${outputDelimiter}([\\s\\S]*?)${outputDelimiter}`, 'm')

// Internal: A small Ruby script that renders the ERB template and encloses the
// output with delimiters.
const rendererPath = join(_dirname, '../src/renderer.rb')

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
async function renderErbFile (cwd: string, filename: string, code: string, options: Options) {
  const { engine = '', runner = '', env, ...execOptions } = options
  const path = relative(cwd, filename)
  try {
    const [cmd, ...cmdArgs] = runner.split(' ')
    const args = [...cmdArgs, rendererPath, outputDelimiter, engine].filter(x => x)

    debug(`rendering ${path}`)
    const { stdout } = await execa(cmd, args, { input: code, cwd, env: { DISABLE_SPRING: '1', ...env }, ...execOptions })
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

type ErbQuery = { erb?: boolean }

function arraify<T> (target: T | T[]): T[] {
  return Array.isArray(target) ? target : [target]
}

const windowsSlashRE = /\\/g
export function slash (p: string): string {
  return p.replace(windowsSlashRE, '/')
}

function getMatcherString (glob: string, cwd: string) {
  if (glob.startsWith('**') || isAbsolute(glob))
    return slash(glob)

  const resolved = join(cwd, glob)
  return slash(resolved)
}

function patternToIdFilter (
  pattern: string | RegExp,
  cwd: string,
): PluginFilter {
  if (pattern instanceof RegExp) {
    return (id: string) => {
      const normalizedId = slash(id)
      const result = pattern.test(normalizedId)
      pattern.lastIndex = 0
      return result
    }
  }

  const glob = getMatcherString(pattern, cwd)
  const matcher = picomatch(glob, { dot: true })
  return (id: string) => {
    const normalizedId = slash(id)
    return matcher(normalizedId)
  }
}

function patternToCodeFilter (pattern: string | RegExp): PluginFilter {
  if (pattern instanceof RegExp) {
    return (code: string) => {
      const result = pattern.test(code)
      pattern.lastIndex = 0
      return result
    }
  }
  return (code: string) => code.includes(pattern)
}

function createFilter (
  exclude: Array<PluginFilter> | undefined,
  include: Array<PluginFilter> | undefined,
): PluginFilter | undefined {
  if (!exclude && !include)
    return

  return (input) => {
    if (exclude?.some(filter => filter(input)))
      return false
    if (include?.some(filter => filter(input)))
      return true
    return !(include && include.length > 0)
  }
}

function normalizeFilter (filter: StringFilter): NormalizedStringFilter {
  if (typeof filter === 'string' || filter instanceof RegExp) {
    return {
      include: [filter],
    }
  }
  if (Array.isArray(filter)) {
    return {
      include: filter,
    }
  }
  return {
    include: filter.include ? arraify(filter.include) : undefined,
    exclude: filter.exclude ? arraify(filter.exclude) : undefined,
  }
}

function createIdFilter (
  filter: StringFilter | undefined,
  cwd = process.cwd(),
): PluginFilter | undefined {
  if (!filter) return
  const { exclude, include } = normalizeFilter(filter)
  const excludeFilter = exclude?.map(p => patternToIdFilter(p, cwd))
  const includeFilter = include?.map(p => patternToIdFilter(p, cwd))
  return createFilter(excludeFilter, includeFilter)
}

function createCodeFilter (
  filter: StringFilter | undefined,
): PluginFilter | undefined {
  if (!filter) return
  const { exclude, include } = normalizeFilter(filter)
  const excludeFilter = exclude?.map(patternToCodeFilter)
  const includeFilter = include?.map(patternToCodeFilter)
  return createFilter(excludeFilter, includeFilter)
}

function createFilterForTransform (
  idFilter: StringFilter | undefined,
  codeFilter: StringFilter | undefined,
  cwd?: string,
): TransformHookFilter | undefined {
  if (!idFilter && !codeFilter) return

  const idFilterFn = createIdFilter(idFilter, cwd)
  const codeFilterFn = createCodeFilter(codeFilter)
  return (id, code) => {
    let fallback = true
    if (idFilterFn)
      fallback &&= idFilterFn(id)
    if (!fallback)
      return false

    if (codeFilterFn)
      fallback &&= codeFilterFn(code)

    return fallback
  }
}

function extractFilter<T extends Function, F> (
  hook: ObjectHook<T, { filter?: F }> | undefined,
) {
  return hook && 'filter' in hook && hook.filter ? hook.filter : undefined
}

type FilterForPluginValue = {
  transform?: TransformHookFilter | undefined
}
const filterForPlugin = new WeakMap<Plugin, FilterForPluginValue>()
function getCachedFilterForPlugin (plugin: Plugin): TransformHookFilter | undefined {
  const hookName = 'transform'
  let filters = filterForPlugin.get(plugin)
  if (filters && hookName in filters)
    return filters[hookName]

  if (!filters) {
    filters = {}
    filterForPlugin.set(plugin, filters)
  }

  const rawFilters = extractFilter(plugin.transform)
  filters.transform = createFilterForTransform(
    rawFilters?.id,
    rawFilters?.code,
  )
  return filters.transform
}

function parseId (id: string) {
  const [filename, rawQuery] = id.split('?', 2)
  const query = parseQuery(rawQuery) as ErbQuery
  if (query.erb !== undefined || filename.endsWith('.erb')) query.erb = true
  return { filename: filename.split('.erb')[0], query }
}

/**
 * Renders .erb files in the context of a Ruby application.
 */
export default function ErbPlugin (options: Options = {}): Plugin {
  let root: string
  let plugins: readonly Plugin[]
  return {
    name: 'erb-plugin',
    enforce: 'pre',
    configResolved (config) {
      plugins = config.plugins.filter(p => p.name !== 'vite:import-analysis' && p.transform != null)
      root = process.env.VITE_RUBY_ROOT || config.root
      if (!options.runner) options.runner = detectRunner(root)
      debug(`running renderer with '${options.runner}'`)
    },
    async transform (code, id, ssr) {
      const { filename, query } = parseId(id)
      if (!query.erb) return

      code = await renderErbFile(root, `${filename}.erb`, code, options)
      for (const plugin of plugins) {
        const filter = getCachedFilterForPlugin(plugin)
        if (filter && !filter(id, code)) continue

        const transform = plugin.transform
        const transformFn = typeof transform === 'object' ? (transform as any).handler : transform
        if (typeof transformFn === 'function') {
          const result = await transformFn.call(this, code, filename, ssr)
          if (result)
            code = typeof result === 'object' ? result.code || '' : result
        }
      }
      return code
    },
  }
}
