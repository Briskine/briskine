const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'})

export default function sortTemplates (list = [], sort = 'last_used', lastUsed = {}) {
  if (['title', 'shortcut'].includes(sort)) {
    return list
      .toSorted((a, b) => {
        return collator.compare(a[sort], b[sort])
      })
  }

  if (sort === 'modified_datetime') {
    return list
      .toSorted((a, b) => {
        return new Date(b.modified_datetime || 0) - new Date(a.modified_datetime || 0)
      })
  }

  // default last_used sort
  return list
    .toSorted((a, b) => {
      return new Date(lastUsed[b.id] || 0) - new Date(lastUsed[a.id] || 0)
    })
}


