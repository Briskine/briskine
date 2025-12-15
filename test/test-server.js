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
import { readFile } from 'node:fs'
import { createServer } from 'node:http'
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
        if (!err) {
          return {}
        }

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
        return (!window.__mochaResult__ && (window.__mochaResult__ = result(this.stats)))
      }

      if (!reporterIsChanged) {
        m.setup({
          reporter: Mocha.reporters[reporter] || Mocha.reporters.spec
        })
      }

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
    if (!M.process) {
      M.process = {}
    }

    if (!M.process.stdout) {
      M.process.stdout = {}
    }

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
  if (isStdout) {
    values = values.slice(1)
  }

  let out = util.format(...values)
  if (!isStdout && out) {
    out += '\n'
  }

  process.stdout.write(out)
}

const timeout = 60000


function staticServer (port = 8000) {
  const MIME_TYPES = {
    html: 'text/html; charset=UTF-8',
    js: 'text/javascript',
    css: 'text/css',
  }

  const STATIC_PATH = process.cwd()

  const server = createServer((req, res) => {
    readFile(path.join(STATIC_PATH, req.url), (err, data) => {
      const ext = path.extname(req.url).substring(1).toLowerCase()
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/html' })
        res.end('404: File not found')
      } else {
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
        res.end(data)
      }
    })
  }).listen(port)

  return server
}


async function run () {
  const server = staticServer()

  const options = {
    ignoreHTTPSErrors: true,
    headless: true,
  }

  let browser
  try {
    browser = await puppeteer.launch(options)
    const pages = await browser.pages()
    const page = pages.pop()

    page.on('console', handleConsole)
    page.on('dialog', dialog => dialog.dismiss())
    page.on('pageerror', () => process.exitCode = 1)

    await page.evaluateOnNewDocument(initMocha)
    await page.goto('http://localhost:8000/test/index.html')
    await page.waitForFunction(() => window.__mochaResult__, { timeout })
    const result = await page.evaluate(() => window.__mochaResult__)

    if (result.result.stats.failures > 0) {
      process.exitCode = 1
    }
  } catch (err) {
    console.error(err)
    process.exitCode = 1
  } finally {
    if (browser) {
      await browser.close()
    }
    server.close()
  }
}

run()
