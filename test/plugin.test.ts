import { copyFileSync, readFileSync } from 'fs'
import { join } from 'path'
import execa from 'execa'
import glob from 'fast-glob'
import { build, InlineConfig } from 'vite'
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
  test('javascript and css', async (done) => {
    expect.assertions(1)
    await buildFixture('a', { mode: 'production' })
    expect(compiledFile('a')).toContain('console.log({rackEnv:"production",railsEnv:"production"})')
    done()
  }, 10000)

  test('typescript and sass', async (done) => {
    expect.assertions(1)
    await buildFixture('b', { mode: 'development' })
    expect(compiledFile('b')).toContain('console.log({rackEnv:"development",railsEnv:"development"})')
    done()
  }, 10000)

  test('jsx', async (done) => {
    expect.assertions(1)
    await buildFixture('c', { mode: 'test' })
    expect(compiledFile('c')).toContain('console.log({rackEnv:"test",railsEnv:"test"})')
    done()
  }, 10000)
})
