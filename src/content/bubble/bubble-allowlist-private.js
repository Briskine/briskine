const urls = [
  'mail.google.com',
  'www.linkedin.com',
  'outlook.live.com',
  'outlook.office365.com',
]

const selector = `
  head [href*="cdn.office.net"],
  meta[content*="owamail"],
  link[href*="/owamail/"],
  script[src*="/owamail/"]
`

export default function bubbleAllowlistPrivate (hostname, { content = false } = {}) {
  if (urls.some((url) => hostname === url)) {
    return true
  }

  if (content === true && document.querySelector(selector)) {
    return true
  }

  return false
}
