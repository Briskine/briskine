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
