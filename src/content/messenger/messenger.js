function Deferred () {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    [resolve, reject] = [res, rej]
  })
  return {promise, reject, resolve}
}

export default function Messenger (scope = '') {
  const handshakeEvent = `briskine-messenger-connect-${scope}`

  let channel
  let port
  const deferreds = {}
  const actions = {}

  // client-only
  const handleHandshake = async function (e) {
    if (e.data.type === handshakeEvent) {
      port = e.ports[0]
      port.onmessage = onMessage
      port.postMessage({ type: handshakeEvent })
      self.removeEventListener('message', handleHandshake)
    }
  }

  self.addEventListener('message', handleHandshake)

  // server-only
  const connect = function (client) {
    self.removeEventListener('message', handleHandshake)

    channel = new MessageChannel()
    port = channel.port1
    port.onmessage = onMessage
    deferreds[handshakeEvent] = Deferred()

    client.postMessage({type: handshakeEvent}, '*', [channel.port2])

    return deferreds[handshakeEvent].promise
  }

  const respond = function (type = '', fn = () => {}) {
    actions[type] = fn
  }

  const request = function (type = '', options = {}) {
    port.postMessage({
      type: type,
      options: options,
    })

    deferreds[type] = Deferred(type)
    return deferreds[type].promise
  }

  async function onMessage (e) {
    const {type} = e.data
    if (actions[type]) {
      const message = {}
      try {
        message.response = await actions[type](e.data.options)
      } catch (err) {
        message.error = err
      }

      // send response
      return port.postMessage({
        type: type,
        ...message
      })
    }

    // resolve local response
    if (deferreds[type]) {
      const {response, error} = e.data
      if (error) {
        return deferreds[type].reject(error)
      }

      deferreds[type].resolve(response)
      deferreds[type] = null
    }
  }

  return {connect, request, respond}
}
