function Deferred () {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    [resolve, reject] = [res, rej]
  })
  return {promise, reject, resolve}
}

function createId () {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function Messenger (scope = '') {
  const instanceId = createId()
  let targetWindow = null
  let remoteInstanceId = null
  let connected = false
  let connectedDeferred = Deferred()
  const pending = new Map()
  const actions = {}

  function onMessage (e) {
    const data = e.data
    if (!data || data._briskine !== true) {
      return
    }
    if (data.scope !== scope) {
      return
    }
    if (data.from === instanceId) {
      return
    }

    if (data.kind === 'handshake') {
      targetWindow = e.source || self
      remoteInstanceId = data.from
      targetWindow.postMessage({
        _briskine: true,
        scope,
        from: instanceId,
        to: data.from,
        kind: 'handshake-ack',
      }, '*')
      return
    }

    if (data.kind === 'handshake-ack') {
      if (data.to !== instanceId) {
        return
      }
      remoteInstanceId = data.from
      connected = true
      connectedDeferred.resolve()
      return
    }

    if (data.to !== instanceId) {
      return
    }

    if (data.kind === 'request') {
      handleRequest(data)
      return
    }

    if (data.kind === 'response') {
      handleResponse(data)
      return
    }
  }

  async function handleRequest (data) {
    const {id, type, options} = data
    const message = {id}
    if (actions[type]) {
      try {
        message.response = await actions[type](options)
      } catch (err) {
        message.error = (err && err.message) ? err.message : String(err)
      }
    }

    targetWindow.postMessage({
      _briskine: true,
      scope,
      from: instanceId,
      to: data.from,
      kind: 'response',
      ...message,
    }, '*')
  }

  function handleResponse (data) {
    const {id, response, error} = data
    const deferred = pending.get(id)
    if (!deferred) {
      return
    }

    pending.delete(id)
    if (error !== undefined && error !== null) {
      deferred.reject(error)
    } else {
      deferred.resolve(response)
    }
  }

  self.addEventListener('message', onMessage)

  const connect = function (clientWindow) {
    targetWindow = clientWindow
    connectedDeferred = Deferred()

    let retries = 20
    function sendHandshake () {
      targetWindow.postMessage({
        _briskine: true,
        scope,
        from: instanceId,
        kind: 'handshake',
      }, '*')
    }

    sendHandshake()

    const interval = setInterval(() => {
      if (connected) {
        clearInterval(interval)
        return
      }
      if (--retries <= 0) {
        clearInterval(interval)
        connectedDeferred.reject(new Error(`Messenger "${scope}" handshake timeout`))
        return
      }
      sendHandshake()
    }, 50)

    return connectedDeferred.promise
  }

  const respond = function (type = '', fn = () => {}) {
    actions[type] = fn
  }

  const request = function (type = '', options = {}) {
    if (!connected) {
      return Promise.reject(new Error(`Messenger "${scope}" not connected`))
    }

    const id = createId()
    const deferred = Deferred()
    pending.set(id, deferred)

    targetWindow.postMessage({
      _briskine: true,
      scope,
      from: instanceId,
      to: remoteInstanceId,
      kind: 'request',
      id,
      type,
      options,
    }, '*')

    return deferred.promise
  }

  return {connect, request, respond}
}
