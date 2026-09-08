/*
 * The url the content script is running on.
 *
 * Used only to be able to mock location in the unit tests.
 * Vitest browser mode can't mock the real window.location because it is not
 * configurable. So we use mock this module instead.
 *
 */

export default function currentUrl () {
  return window.location
}
