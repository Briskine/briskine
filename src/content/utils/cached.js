export default function cached (cache, key, get) {
  if (!cache.has(key)) {
    cache.set(key, get())
  }

  return cache.get(key)
}
