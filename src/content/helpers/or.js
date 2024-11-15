// conditional or helper
export default function or (...args) {
  // last argument is the handlebars options object
  const params = args.slice(0, args.length - 1)
  return params.find((p) => Boolean(p))
}
