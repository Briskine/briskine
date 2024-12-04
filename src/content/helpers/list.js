// general purpose list helper
// exposes all methods on the Array object
export default function list (arr = [], method, ...args) {
  // convenience method to convert strings to arrays.
  // avoids having to use string split before using list methods.
  if (typeof arr === 'string') {
    arr = new Array(arr)
  }

  if (
    !Array.isArray(arr)
    || typeof method !== 'string'
    || !(Array.prototype[method] instanceof Function)
  ) {
    return ''
  }

  // last argument is the handlebars options object
  const params = args.slice(0, args.length - 1)
  return Array.prototype[method].apply(arr, params)
}
