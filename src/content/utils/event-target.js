// returns the event target
// with support for composed events from shadow dom
import getShadowRoot from './shadow-root.js'

export default function getEventTarget (e) {
  let target = e.target
  // get target from shadow dom if event is composed
  if (e.composed) {
    target = e.composedPath()[0] || target
  }

  // closed shadow roots hide their nodes from the event,
  // use the focused element inside them.
  let root = getShadowRoot(target)
  while (root?.activeElement) {
    target = root.activeElement
    root = getShadowRoot(target)
  }

  return target
}
