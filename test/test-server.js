/*
 * Forked from
 * https://github.com/direct-adv-interfaces/mocha-headless-chrome
 * under the MIT License
 *
 */
/* globals Mocha, process */
/* eslint no-console: 0 */

import path from 'path'
import util from 'node:util'
import puppeteer from 'puppeteer'

function initMocha(reporter) {
  console.log = (console => {
    const log = console.log.bind(console)
    return (...args) => args.length ? log(...args) : log('')
  })(console)

  function shimMochaInstance(m) {
    const originalReporter = m.reporter.bind(m)
    let reporterIsChanged = false

    m.reporter = (...args) => {
      reporterIsChanged = true
      originalReporter(...args)
    }

    const run = m.run.bind(m)

    m.run = () => {
      const all = [], pending = [], failures = [], passes = []

      function error(err) {
        if (!err) return {}

        let res = {}
        Object.getOwnPropertyNames(err).forEach(key => res[key] = err[key])
        return res
      }

      function clean(test) {
        return {
          title: test.title,
          fullTitle: test.fullTitle(),
          duration: test.duration,
          err: error(test.err),
        }
      }

      function result(stats) {
        return {
          result: {
            stats: {
              tests: all.length,
              passes: passes.length,
              pending: pending.length,
              failures: failures.length,
              start: stats.start.toISOString(),
              end: stats.end.toISOString(),
              duration: stats.duration
            },
            tests: all.map(clean),
            pending: pending.map(clean),
            failures: failures.map(clean),
            passes: passes.map(clean)
          },
          coverage: window.__coverage__,
        }
      }

      function setResult() {
        !window.__mochaResult__ && (window.__mochaResult__ = result(this.stats))
      }

      !reporterIsChanged && m.setup({
        reporter: Mocha.reporters[reporter] || Mocha.reporters.spec
      })

      const runner = run(() => setTimeout(() => setResult.call(runner), 0))
        .on('pass', test => {
          passes.push(test)
          all.push(test)
        })
        .on('fail', test => {
          failures.push(test)
          all.push(test)
        })
        .on('pending', test => {
          pending.push(test)
          all.push(test)
        })
        .on('end', setResult)

      return runner
    }
  }

  function shimMochaProcess(M) {
    // Mocha needs a process.stdout.write in order to change the cursor position.
    !M.process && (M.process = {})
    !M.process.stdout && (M.process.stdout = {})

    M.process.stdout.write = data => console.log('stdout:', data)
    M.reporters.Base.useColors = true
    M.reporters.none = function None(runner) {
      M.reporters.Base.call(this, runner)
    }
  }

  Object.defineProperty(window, 'mocha', {
    get: function() {
      return undefined
    },
    set: function(m) {
      shimMochaInstance(m)
      delete window.mocha
      window.mocha = m
    },
    configurable: true,
  })

  Object.defineProperty(window, 'Mocha', {
    get: function() {
      return undefined
    },
    set: function(m) {
      shimMochaProcess(m)
      delete window.Mocha
      window.Mocha = m
    },
    configurable: true,
  })
}

async function handleConsole(msg) {
  const args = msg.args()

  let values = await Promise.all(args.map(a => a.jsonValue().catch(() => '')))
  // process stdout stub
  let isStdout = values[0] === 'stdout:'
  isStdout && (values = values.slice(1))

  let out = util.format(...values)
  !isStdout && out && (out += '\n')
  process.stdout.write(out)
}

const timeout = 60000

function run () {
  const file = 'test/index.html'
  let resolvedPath = path.resolve(file)
  const url = `file://${resolvedPath}`

  const options = {
    ignoreHTTPSErrors: true,
    headless: true,
  }

  puppeteer
    .launch(options)
    .then(browser => browser.pages()
    .then(pages => pages.pop())
    .then(page => {
      page.on('console', handleConsole)
      page.on('dialog', dialog => dialog.dismiss())
      page.on('pageerror', err => console.error(err))

      return page.evaluateOnNewDocument(initMocha)
        .then(() => page.goto(url))
        .then(() => page.waitForFunction(() => window.__mochaResult__, { timeout }))
        .then(() => page.evaluate(() => window.__mochaResult__))
        .then(obj => {
          browser.close()
          return obj
        })
    }))
}

run()
