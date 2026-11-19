/* globals cloneInto */

// firefox runs content scripts in a separate js context,
// and the page receives an empty DataTransfer from events created there.
// create the event with the page constructors.
export default function createDataTransferEvent ({
  constructor,
  type,
  dataKey,
  props = {},
  text = '',
  html = '',
}) {
  const pageWindow = window.wrappedJSObject || window
  let init = {
    ...props,
    [dataKey]: new pageWindow.DataTransfer(),
  }

  if (typeof cloneInto === 'function') {
    init = cloneInto(init, window, {wrapReflectors: true})
  }

  const e = new pageWindow[constructor](type, init)
  // set the data on the event, the DataTransfer instance we passed can be a copy.
  e[dataKey].setData('text/plain', text)
  e[dataKey].setData('text/html', html)

  return e
}
