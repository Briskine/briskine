export function batch (callback = () => {}) {
  let requested = false
  return async () => {
    if (!requested) {
      requested = true
      requested = await false
      callback()
    }
  }
}

export function reactive (props = {}, component = {}, callback = () => {}) {
  Object.keys(props).forEach((key) => {
    Object.defineProperty(component, key, {
      set (value) {
        if (props[key] !== value) {
          props[key] = value
          callback(key, value, props)
        }
      },
      get () {
        return props[key]
      }
    })
  })

  return props
}
