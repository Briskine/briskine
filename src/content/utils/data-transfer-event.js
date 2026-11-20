/* globals cloneInto */
export default function createDataTransferEvent ({
  constructor,
  type,
  dataKey,
  props = {},
  text = '',
  html = '',
}) {
  // firefox sends empty DataTransfer events,
  // if the event is not created in the page context.
  // use wrappedJSObject and cloneInto to work around it.
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
