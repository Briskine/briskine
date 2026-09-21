/*
 * Load a fixture page from test/pages into an iframe.
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
