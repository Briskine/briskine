const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})

export default function sortTemplates (list = [], sort = 'last_used', lastUsed = {}) {
  // Chrome 109 (last version supported on Windows 7) doesn't support toSorted,
  // so we clone the array and use regular sort.
  const templates = structuredClone(list)
  if (['title', 'shortcut'].includes(sort)) {
    return templates
      .sort((a, b) => {
        return collator.compare(a[sort], b[sort])
      })
  }

  if (sort === 'modified_datetime') {
    return templates
      .sort((a, b) => {
        return new Date(b.modified_datetime || 0) - new Date(a.modified_datetime || 0)
      })
  }

  // default last_used sort
  return templates
    .sort((a, b) => {
      return new Date(lastUsed[b.id] || 0) - new Date(lastUsed[a.id] || 0)
    })
}


