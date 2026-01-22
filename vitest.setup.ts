
globalThis.VERSION = 3
globalThis.ENV = 'test'
globalThis.MANIFEST = 3

// mock webextension api
window.browser = {
  runtime: {
    id: 'test',
    onMessage: {
      addListener: () => {}
    },
    getURL: (str) => `test/bundle/${str}`,
  }
}

window.chrome = window.browser 
