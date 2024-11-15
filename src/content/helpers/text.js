// general purpose text helper
// can use all methods on the String object
export default function text (str = '', method, ...args) {
  if (
    typeof str !== 'string'
    || typeof method !== 'string'
    || !(String.prototype[method] instanceof Function)
  ) {
    return ''
  }

  // last argument is the handlebars options object
  const params = args.slice(0, args.length - 1)
  return String.prototype[method].apply(str, params)
}
