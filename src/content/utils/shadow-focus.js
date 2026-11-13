// shadow root support for focusin/out.
// focusin and focusout events are *composed*, so they bubble out of the shadow dom.
// but *only if the shadow root host loses or gains focus*.
// if all of the focusing and blurring happens inside the same shadow root,
// only the shadow root will be able to catch those events.
// only when we focus outside of the shadow root (or when we focus inside the shadow root, from outside),
// will our regular document handler catch the event.
// that's why we need to also need to attach the focusin/out listeners to the shadow roots.
import { getActiveElement } from './active-element.js'
import getShadowRoot from './shadow-root.js'

export function addFocusListeners (callback = () => {}, eventType = '') {
  const shadowRootsRegistry = new WeakSet()
  // the same event can reach several of our listeners
  const handledEvents = new WeakSet()

  const abortController = new AbortController()
  const listenerOptions = {
    capture: true,
    signal: abortController.signal,
  }

  function handle (e) {
    if (handledEvents.has(e)) {
      return
    }

    handledEvents.add(e)
    callback(e)
  }

  function callbackWrap (e) {

    const path = e.composedPath()
    // find the inner most root, to support nested shadow roots
    const innermostRoot = path.find(node => node instanceof ShadowRoot)
    const isTop = e.currentTarget === window

    if (
      // if this listener is attached to the top,
      // and doesn't originate in a shadow root.
      (isTop && !innermostRoot)
      // this listener is attached to the innermost shadow root.
      // required for nested shadow roots.
      || e.currentTarget === innermostRoot
    ) {
      handle(e)
    }
  }

  function hookShadowRoot (shadow, event) {
    if (shadow instanceof ShadowRoot && !shadowRootsRegistry.has(shadow)) {
      shadowRootsRegistry.add(shadow)

      if (eventType) {
        shadow.addEventListener(eventType, callbackWrap, listenerOptions)
      } else {
        shadow.addEventListener('focusin', callbackWrap, listenerOptions)
        shadow.addEventListener('focusout', callbackWrap, listenerOptions)
      }

      // if this is the first time we hook this shadow root,
      // the focusin event could already be in progress.
      // manually trigger it because the newly attached listener might miss it.
      if (event) {
        handle(event)
      }
    }
  }

  function hookShadowOnFocus (event) {
    const path = event.composedPath()
    for (const node of path) {
      hookShadowRoot(node, event)
    }

    // closed shadow roots are not in the event path
    let root = getShadowRoot(path[0])
    while (root) {
      hookShadowRoot(root, event)
      root = getShadowRoot(root.activeElement)
    }
  }

  function destroy () {
    abortController.abort()
  }

  window.addEventListener('focusin', hookShadowOnFocus, listenerOptions)

  if (eventType) {
    window.addEventListener(eventType, callbackWrap, listenerOptions)
  } else {
    window.addEventListener('focusin', callbackWrap, listenerOptions)
    window.addEventListener('focusout', callbackWrap, listenerOptions)
  }

  // give it a second, in case listeners were called and destroyed.
  // resolves issues with double-calling the callback.
  setTimeout(() => {
    const activeElement = getActiveElement(true)
    if (activeElement && !abortController.signal.aborted) {
      const activeRoot = activeElement.getRootNode()
      const event = {
        type: 'focusin',
        target: activeElement,
      }

      if (activeRoot instanceof ShadowRoot) {
        hookShadowRoot(activeRoot, event)
      } else {
        callback(event)
      }
    }
  })

  return destroy
}
