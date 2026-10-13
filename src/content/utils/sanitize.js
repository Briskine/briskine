import DOMPurify from 'dompurify'

export default function sanitize (html = '', options = {}) {
  return DOMPurify.sanitize(html, options)
}
