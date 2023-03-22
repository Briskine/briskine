/*
 * Swipe right support
 */

const threshold = 20
const timeout = 500

let done = () => {}
let xstart = null
let touchTime = null

function touchstart (e) {
  touchTime = Date.now()
  xstart = e.touches[0].clientX
}

function touchend (e) {
  const xend = e.changedTouches[0].clientX
  const xdiff = xend - xstart
  const timeDiff = Date.now() - touchTime
  if (
    xdiff > threshold
    && timeDiff < timeout
  ) {
    done(e)
  }
}

export function swipebind (callback = () => {}) {
  done = callback

  window.addEventListener('touchstart', touchstart, true)
  window.addEventListener('touchend', touchend, true)
}

export function swipeunbind () {
  window.removeEventListener('touchstart', touchstart, true)
  window.removeEventListener('touchend', touchend, true)
}
