function querySelectDeep (selector, root = document) {
  const found = root.querySelector(selector)
  if (found) {
    return found
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let el = walker.nextNode()

  while (el) {
    if (el.shadowRoot) {
      const foundInShadow = querySelectDeep(selector, el.shadowRoot)
      if (foundInShadow) {
        return foundInShadow
      }
    }
    el = walker.nextNode()
  }

  return null
}

function waitForReady(context) {
  let resolve
  const promise = new Promise((res) => resolve = res)

  const doc = context.document

  const focusEditable = () => {
    const editable = querySelectDeep('[contenteditable], textarea, input', doc)
    if (!editable) {
      return resolve()
    }

    editable.focus()
  }

  context.addEventListener('message', (e) => {
    if (e?.data === 'briskine-ready') {
      resolve()
    }
  })

  if (doc.readyState === 'complete') {
    focusEditable()
  } else {
    context.addEventListener('load', focusEditable)
  }

  return promise
}

function waitForReadyFrames () {
  const iframes = document.querySelectorAll('iframe')
  return Promise
    .all([...iframes]
    .map((frame) => waitForReady(frame.contentWindow)))
}

async function ready () {
  await waitForReady(window)
  await waitForReadyFrames()
  // eslint-disable-next-line no-console
  console.log('BSKN inited')
}

ready()
