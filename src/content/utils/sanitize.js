import DOMPurify from 'dompurify'

export default function sanitize (html = '') {
  return DOMPurify.sanitize(html)
}
