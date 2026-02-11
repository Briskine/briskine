/*
 * Collection of query selector functions that pierce shadow dom.
 *
 * For better performance, they only support basic selectors.
 * Complex selectors like `body > shadow-dom > .custom` won't work.
 *
 */

export function querySelectorDeep (selector, root = document, method = 'querySelector') {
   const found = root[method](selector)
   if (found) {
     return found
   }

   const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
   let el = walker.nextNode()

   while (el) {
     if (el.shadowRoot) {
       const foundInShadow = querySelectorDeep(selector, el.shadowRoot, method)
       if (foundInShadow) {
         return foundInShadow
       }
     }
     el = walker.nextNode()
   }

   return null
 }

 export function closestDeep (selector, el) {
   if (
     !el
     || el === document
     || el === window
   ) {
     return null
   }

   const found = el.closest(selector)
   if (found) {
     return found
   }

   const root = el.getRootNode()
   if (root instanceof ShadowRoot) {
     return closestDeep(root.host, selector)
   }

   return null
 }
