export default function Messenger ({type = 'server'}) {
  const handshakeEvent = 'handshake'

  let channel
  let port
  if (type === 'server') {
    channel = new MessageChannel()
    port = channel.port1
    port.onmessage = onMessage
  } else if (type === 'client') {
    const handleHandshake = function (e) {
      if (e.data.type === handshakeEvent) {
        port = e.ports[0]
        port.onmessage = onMessage
        window.removeEventListener('message', handleHandshake)
      }
    }

    window.addEventListener('message', handleHandshake)
  }

  const handshake = function (clientWindow) {
    clientWindow.postMessage({type: handshakeEvent}, '*', [channel.port2])
  }

  const actions = {}
  const respond = function (type = '', fn = () => {}) {
    actions[type] = fn
  }

  function Deferred () {
    let resolve, reject
    const promise = new Promise((res, rej) => {
      [resolve, reject] = [res, rej]
    })
    return {promise, reject, resolve}
  }

  const deferreds = {}
  const request = function (type = '', options = {}) {
    port.postMessage({
      type: type,
      options: options,
    })

    deferreds[type] = Deferred(type)
    return deferreds[type].promise
  }

  async function onMessage (e) {
    const type = e.data.type
    if (actions[type]) {
      const actionResponse = await actions[type](e.data.options)
      // send client response
      return port.postMessage({
        type: type,
        response: actionResponse,
      })
    }

    const response = e.data.response
    deferreds[type].resolve(response)
  }

  return {handshake, request, respond}
}
