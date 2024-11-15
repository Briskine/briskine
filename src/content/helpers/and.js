// conditional and helper
export default function and (...args) {
  // last argument is the handlebars options object
  const params = args.slice(0, args.length - 1)
  const valid = params.every((p) => Boolean(p))
  // if true, return the last item value.
  // acts as the opposite of OR, which returns the first truthy value.
  // return undefined to be consistent with find() with no matches, and print empty string in handlebars.
  return valid ? params[params.length - 1] : undefined
}


