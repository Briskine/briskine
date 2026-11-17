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
  // stop GitHub search from closing when clicking inside our dialog
  'mousedown',
  'mouseup',
  // stop pages from reacting to focus moving to our fields,
  // e.g. closing their popups
  'focus',
  'focusin',
]

const relatedTargetEvents = [
  // stop pages (e.g. GitHub search) from handling blur, when focus moves to our
  // fields
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
