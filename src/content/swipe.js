/*
 * Swipe right support
 */

const threshold = 20
const timeout = 500

let done = () => {}
let xdown = null
let xup = null
let touchTime = null
let startElement = null

function touchstart (e) {
  startElement = e.target
  touchTime = Date.now()
  xdown = e.touches[0].clientX
}

function touchmove (e) {
  if (!xdown) {
    return
  }

  xup = e.touches[0].clientX
}

function touchend (e) {
  if (startElement !== e.target) {
    return
  }

  const xdiff = xdown - xup
  const timeDiff = Date.now() - touchTime
  if (
    Math.abs(xdiff) > threshold
    && timeDiff < timeout
    && xdiff < 0
  ) {
    done(e)
  }
}

export function swipebind (callback = () => {}) {
  done = callback

  window.addEventListener('touchstart', touchstart, true)
  window.addEventListener('touchmove', touchmove, true)
  window.addEventListener('touchend', touchend, true)
}

export function swipeunbind () {
  window.removeEventListener('touchstart', touchstart, true)
  window.removeEventListener('touchmove', touchmove, true)
  window.removeEventListener('touchend', touchend, true)
}
