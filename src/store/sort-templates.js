export default function sortTemplates (templates = [], sort = 'last_used', lastUsed = {}) {
  if (['title', 'shortcut'].includes(sort)) {
    return templates
      .toSorted((a, b) => {
        return a[sort].localeCompare(b[sort])
      })
  }

  if (sort === 'modified_datetime') {
    return templates
      .toSorted((a, b) => {
        return new Date(b.modified_datetime || 0) - new Date(a.modified_datetime || 0)
      })
  }

  // default last_used sort
  return templates
    .toSorted((a, b) => {
      return new Date(lastUsed[b.id] || 0) - new Date(lastUsed[a.id] || 0)
    })
}


