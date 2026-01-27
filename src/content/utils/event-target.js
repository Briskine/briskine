// returns the event target
// with support for composed events from shadow dom
export default function getEventTarget (e) {
  // get target from shadow dom if event is composed
  if (e.composed) {
    const composedPath = e.composedPath()
    if (composedPath[0]) {
      return e.composedPath()[0]
    }
  }

  return e.target
}
