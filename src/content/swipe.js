/*
 * Swipe right support
 */

const threshold = 30
const velocity = 0.2
const ratio = 2
const timeout = 1000

let done = () => {}
let touchId = null
let xstart = 0
let ystart = 0
let touchTime = 0

function reset () {
  touchId = null
}

function touchstart (e) {
  // ignore multi-touch gestures
  if (e.touches.length > 1) {
    reset()
    return
  }

  const touch = e.changedTouches[0]
  touchId = touch.identifier
  touchTime = Date.now()
  xstart = touch.clientX
  ystart = touch.clientY
}

function touchend (e) {
  if (touchId === null) {
    return
  }

  // only track the touch we started with
  const touch = Array.from(e.changedTouches).find((t) => t.identifier === touchId)
  if (!touch) {
    return
  }

  const xdiff = touch.clientX - xstart
  const ydiff = Math.abs(touch.clientY - ystart)
  const timeDiff = Date.now() - touchTime

  reset()

  if (
    xdiff > threshold
    && xdiff > ydiff * ratio
    && timeDiff < timeout
    && xdiff / timeDiff > velocity
  ) {
    done(e)
  }
}

export function swipebind (callback = () => {}) {
  done = callback

  window.addEventListener('touchstart', touchstart, { capture: true, passive: true })
  window.addEventListener('touchend', touchend, true)
  window.addEventListener('touchcancel', reset, { capture: true, passive: true })
}

export function swipeunbind () {
  reset()

  window.removeEventListener('touchstart', touchstart, true)
  window.removeEventListener('touchend', touchend, true)
  window.removeEventListener('touchcancel', reset, true)
}
