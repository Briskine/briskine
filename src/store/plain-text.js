// naive html to text conversion
export default function plainText (html = '') {
  return html.replace(/(<[^>]*>)|(&nbsp;)/g, '').replace(/\s+/g, ' ').trim()
}
