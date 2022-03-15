/* Script runs in the full context of the page,
 * and has access to the page JavaScript context.
 *
 * The content script runs in an "isolated world" context,
 * and doesn't have access to the full JavaScript context.
 * https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world
 *
 * When we upgrade to Manifest v3, we'll be able to use
 * chrome.scripting.executeScript with ExecutionWorld,
 * and this script will be obsolete.
 */

import config from '../config.js'

function handlePageEvents (e) {
  console.log('briskine custom listener')
}

document.addEventListener(config.eventPage, handlePageEvents)

document.addEventListener(config.eventDestroy, () => {
  document.removeEventListener(config.eventPage, handlePageEvents)
}, {once: true})
