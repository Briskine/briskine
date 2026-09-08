/*
 * Load a fixture page from test/pages into an iframe.
 *
 * Resolves with the iframe once it has loaded,
 * so specs can reach its contentDocument and remove it when done.
 *
 */

export default async function loadIframe (src = '') {
  const iframe = document.createElement('iframe')

  const loaded = new Promise((resolve, reject) => {
    iframe.onload = () => resolve(iframe)
    iframe.onerror = reject
  })

  iframe.src = src
  document.body.appendChild(iframe)

  return loaded
}
