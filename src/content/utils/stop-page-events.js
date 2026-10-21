// keep the page from handling events in our ui.
// events from our shadow dom reach the page with our element as the target,
// so the page can't tell they come from our fields.
// also hides them from listeners inside our shadow dom.

const targetEvents = [
  // stop Gmail from running its keyboard shortcuts while typing in our fields
  'keydown',
  'keyup',
  // stop Front from catching keyboard shortcuts when typing in our fields
  'keypress',
  // stop GitHub search from closing the dialog when clicking inside it
  'mousedown',
  'mouseup',
  // stop GitHub search from preventing opening the dialog
  // stop LinkedIn New Post from stealing focus when opening the dialog
  'focus',
  'focusin',
]

const relatedTargetEvents = [
  // stop GitHub search and LinkedIn new post from handling blur
  'blur',
  'focusout',
]

// element is any element in our shadow root
export default function stopPageEvents (element, signal) {
  function isOurs (target) {
    const host = element.getRootNode().host
    return Boolean(host && target) && (target === host || target.getRootNode?.().host === host)
  }

  const listenerOptions = {
    capture: true,
    signal,
  }

  targetEvents.forEach((event) => {
    window.addEventListener(event, (e) => {
      if (isOurs(e.target)) {
        e.stopPropagation()
      }
    }, listenerOptions)
  })

  relatedTargetEvents.forEach((event) => {
    window.addEventListener(event, (e) => {
      if (isOurs(e.relatedTarget)) {
        e.stopPropagation()
      }
    }, listenerOptions)
  })
}
