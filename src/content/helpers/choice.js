// legacy random choice helper
// {{ choice 'one, two, three' }}

export default function choice (args) {
  // split by comma and trim
  args = args.split(',').map((a) => a.trim())
  return args[Math.floor(Math.random() * args.length)]
}
