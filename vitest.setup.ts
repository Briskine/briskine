// mock webextension api
window.browser = {
  runtime: {
    id: 'test',
    onMessage: {
      addListener: () => {}
    },
    getURL: (str) => `src/content/${str}`,
  }
}

window.chrome = window.browser

// firefox can start a test file before its frame has focus,
// then focusing elements, typing and inserting in them silently fail.
if (!document.hasFocus()) {
  window.focus()
}
