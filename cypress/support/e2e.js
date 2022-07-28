/* globals Cypress */
import 'cypress-plugin-tab'

import './commands.js'

Cypress.on('test:before:run', (test, runnable) => {
  // skip all dialog tests on Firefox,
  // until they fix the Permission Denied bug when accessing any properties
  // on custom elements in content scripts.
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1492002
  if (Cypress.browser.family ==='firefox' && test.title.includes('dialog')) {
    runnable.skip()
  }
})
