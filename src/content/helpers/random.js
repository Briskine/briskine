// random choice helper
// keeps the random numbers per session, so re-renders show the same choices
export default function createRandom (numbers = []) {
  let index = 0

  return function random (...args) {
    // last argument is the handlebars options object
    const params = args.slice(0, args.length - 1)

    numbers[index] ??= Math.random()
    return params[Math.floor(numbers[index++] * params.length)]
  }
}
