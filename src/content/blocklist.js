const blocklistPrivate = [
  '.briskine.com',

  // slack pdf viewer stops working (considering the pdf corrupt),
  // when the iframe dom is modified.
  // the pdf viewer is used for previewing multiple attachment types (pdf, docx, etc.).
  '//app.slack.com/pdf-viewer',
]

function getBlocklist (settings = {}) {
  return blocklistPrivate.concat(settings.blacklist)
}

export function isBlocklisted (settings = {}, currentUrl = '') {
  return getBlocklist(settings).find((url) => {
    return url && currentUrl.includes(url)
  })
}

