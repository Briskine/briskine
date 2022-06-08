// TODO explain

import Handlebars from 'handlebars'

console.log('setup iframe')
window.addEventListener("message", (e) => {
  const test = Handlebars.compile('test {{a}}')({a:'a'})

  console.log('send', test)
  e.source.postMessage(test)
})

