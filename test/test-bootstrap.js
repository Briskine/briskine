/* Mocha startup
 */

mocha.setup('bdd')
mocha.checkLeaks()
mocha.globals([
  // puppeteer globals
  'puppeteer___ariaQuerySelector',
  '__ariaQuerySelector',
  'puppeteer___ariaQuerySelectorAll',
  '__ariaQuerySelectorAll',
])

/* polyfill
 */

// mock webextension api
window.browser = {
  runtime: {
    id: 'test',
    onMessage: {
      addListener: () => {}
    },
    getURL: (str) => `bundle/${str}`,
  }
}

window.chrome = window.browser

