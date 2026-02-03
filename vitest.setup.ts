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
