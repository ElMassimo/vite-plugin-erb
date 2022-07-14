import { readFileSync } from 'fs'
import { join } from 'path'
import execa from 'execa'
import glob from 'fast-glob'
import type { InlineConfig } from 'vite'
import { describe, test, expect } from 'vitest'

type Fixture = 'a' | 'b' | 'c'

function compiledFile (name: Fixture) {
  const distPath = join(__dirname, 'fixtures', 'blog', 'public', name)
  const files = glob.sync('assets/application.*.js', { cwd: distPath })
  return readFileSync(join(distPath, files[0]), { encoding: 'utf8' })
}

async function buildFixture (name: Fixture, { mode }: InlineConfig) {
  await execa('bin/vite', ['build', '--clear', '--mode', mode], {
    cwd: join(__dirname, 'fixtures', 'blog'),
    env: {
      VITE_RUBY_ENTRYPOINTS_DIR: `entrypoints_${name}`,
      VITE_RUBY_PUBLIC_OUTPUT_DIR: name,
    },
  })
}

describe('erb', () => {
  test('javascript and css', async () => {
    await buildFixture('a', { mode: 'production' })
    const result = compiledFile('a')
    expect(result).toContain('"production"')
    expect(result).toMatchSnapshot()
  }, 10000)

  test('typescript and sass', async () => {
    await buildFixture('b', { mode: 'development' })
    const result = compiledFile('b')
    expect(result).toContain('"development"')
    expect(result).toMatchSnapshot()
  }, 10000)

  test('jsx', async () => {
    await buildFixture('c', { mode: 'test' })
    const result = compiledFile('c')
    expect(result).toContain('"test"')
    expect(result).toMatchSnapshot()
  }, 10000)
})
