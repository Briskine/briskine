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
window.chrome = {
  runtime: {
    id: 'test',
    onMessage: {
      addListener: () => {}
    },
    getURL: (str) => `bundle/${str}`,
  }
}
