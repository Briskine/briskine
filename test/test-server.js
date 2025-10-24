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


function run () {
  const server = staticServer()

  const options = {
    ignoreHTTPSErrors: true,
    headless: true,
  }

  puppeteer
    .launch(options)
    .then(browser => {
      return browser.pages()
        .then(pages => pages.pop())
        .then(page => {
          page.on('console', handleConsole)
          page.on('dialog', dialog => dialog.dismiss())
          page.on('pageerror', err => console.error(err))

          return page.evaluateOnNewDocument(initMocha)
            .then(() => page.goto('http://localhost:8000/test/index.html'))
            .then(() => page.waitForFunction(() => window.__mochaResult__, { timeout }))
            .then(() => page.evaluate(() => window.__mochaResult__))
            .then(() => {
              browser.close()
              server.close()
            })
        })
    })
}

run()
