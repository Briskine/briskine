/*
 * Position of the current frame in the top frame's viewport.
 *
 * Each frame asks its parent where its iframe element is,
 * so it also works with cross-origin frames.
 */

import { querySelectorAllDeep } from './selectors.js'

const offsetRequest = 'briskine-frame-offset'
// the parent doesn't run our content script
const answerTimeout = 500

let abortController = null

function findFrame (source) {
  const isSource = (frame) => frame.contentWindow === source
  // shadow roots are slower to search
  return Array.from(document.querySelectorAll('iframe, frame')).find(isSource)
    || querySelectorAllDeep('iframe, frame').find(isSource)
}

// the frame's viewport starts inside its border and padding
function contentOffset (frame) {
  const rect = frame.getBoundingClientRect()
  const style = window.getComputedStyle(frame)
  return {
    top: rect.top + frame.clientTop + parseFloat(style.paddingTop),
    left: rect.left + frame.clientLeft + parseFloat(style.paddingLeft),
  }
}

// resolves null when an ancestor frame doesn't answer
export default function getFrameOffset () {
  if (window === window.top) {
    return Promise.resolve({
      top: 0,
      left: 0,
    })
  }

  return new Promise((resolve) => {
    const channel = new MessageChannel()

    const timer = setTimeout(() => {
      channel.port1.close()
      resolve(null)
    }, answerTimeout)

    channel.port1.onmessage = (e) => {
      clearTimeout(timer)
      channel.port1.close()
      resolve(e.data)
    }

    window.parent.postMessage({type: offsetRequest}, '*', [channel.port2])
  })
}

async function respondToOffset (e) {
  const [port] = e.ports
  if (e.data?.type !== offsetRequest || !port) {
    return
  }

  const frame = findFrame(e.source)
  const parentOffset = frame ? await getFrameOffset() : null
  let offset = null
  if (parentOffset) {
    const frameOffset = contentOffset(frame)
    offset = {
      top: parentOffset.top + frameOffset.top,
      left: parentOffset.left + frameOffset.left,
    }
  }

  port.postMessage(offset)
  port.close()
}

export function setup () {
  abortController = new AbortController()
  window.addEventListener('message', respondToOffset, {signal: abortController.signal})
}

export function destroy () {
  abortController?.abort()
  abortController = null
}
