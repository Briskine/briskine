// window.location is unforgeable and can't be mocked in specs
export default function currentUrl () {
  return window.location
}
