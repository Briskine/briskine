/* Mocha startup
 */

mocha.setup('bdd')
mocha.checkLeaks()

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

// array toSorted polyfill for mocha-headless-chrome,
// remove when mocha-headless-chrome uses a new version of puppeteer.
if (!Array.prototype.toSorted) {
  Array.prototype.toSorted = function () {
    let arr = this
    arr.sort()
    return arr
  }
}
