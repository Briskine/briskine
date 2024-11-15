/* Mocha startup
 */

mocha.setup('bdd')
mocha.checkLeaks()
mocha.globals([
  // puppeteer globals
  'puppeteer___ariaQuerySelector',
  '__ariaQuerySelector',
  'puppeteer___ariaQuerySelectorAll',
  '__ariaQuerySelectorAll',
])

/* polyfill
 */

const defaultTemplates = [
  {
    title: 'Say Hello',
    shortcut: 'h',
    subject: '',
    tags: [],
    body: '<div>Hello {{to.first_name}},</div><div></div>'
  },
  {
    title: 'Nice talking to you',
    shortcut: 'nic',
    subject: '',
    tags: [],
    body: '<div>It was nice talking to you.</div>'
  },
  {
    title: 'Kind Regards',
    shortcut: 'kr',
    subject: '',
    tags: [],
    body: '<div>Kind regards,</div><div>{{from.first_name}}.</div>'
  },
  {
    title: 'My email',
    shortcut: 'e',
    subject: '',
    tags: [],
    body: '<div>{{from.email}}</div>'
  },
]

// mock webextension api
window.browser = {
  runtime: {
    id: 'test',
    onMessage: {
      addListener: () => {}
    },
    getURL: (str) => `bundle/${str}`,
    sendMessage: async ({type, data}) => {
      if (type === 'getTemplates') {
        return defaultTemplates
      }

      return []
    }
  }
}

window.chrome = window.browser

