import { readFileSync } from 'fs'
import { join } from 'path'
import execa from 'execa'
import glob from 'fast-glob'
import { build, InlineConfig } from 'vite'

type Fixture = 'blog'

function compiledApp (name: Fixture, distDir = 'vite') {
  const distPath = join(__dirname, 'fixtures', name, `public/${distDir}`)
  const files = glob.sync('assets/application.*.js', { cwd: distPath })
  return readFileSync(join(distPath, files[0]), { encoding: 'utf8' })
}

async function buildFixture (name: Fixture, { mode }: InlineConfig) {
  await execa('bin/vite', ['build', '--clear', '--mode', mode], { cwd: join(__dirname, 'fixtures', name) })
}

describe('erb', () => {
  test('replaces the variables', async (done) => {
    expect.assertions(1)
    await buildFixture('blog', { mode: 'production' })
    expect(compiledApp('blog')).toContain('console.log({rackEnv:"production",railsEnv:"production"})')
    done()
  })

  test('replaces the variables', async (done) => {
    expect.assertions(1)
    await buildFixture('blog', { mode: 'development' })
    expect(compiledApp('blog', 'vite-dev')).toContain('console.log({rackEnv:"development",railsEnv:"development"})')
    done()
  })
})
