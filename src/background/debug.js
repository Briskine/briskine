/* globals ENV */

let debug = () => {}
if (ENV !== 'production') {
  debug = (data = [], method = 'log') => {
    /* eslint-disable no-console */
    console.group(data.shift())
    data.forEach((item) => {
      console[method](item)
    })
    console.groupEnd()
    /* eslint-enable no-console */
  }
}

export default debug
