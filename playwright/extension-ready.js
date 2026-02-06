function waitForReady (context) {
  let resolve
  const promise = new Promise((res) => resolve = res)

  const doc = context.document

  const focusEditable = () => {
    const editable = doc.querySelector('[contenteditable], textarea, input')
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
