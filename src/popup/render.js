import nanomorph from 'nanomorph'

export default function render (fromElement, toElement, options = {}) {
    options.childrenOnly = true

    if (typeof toElement === 'string') {
        const fragment = document.createElement('div')
        fragment.innerHTML = toElement.trim()
        toElement = fragment
    }

    return nanomorph(fromElement, toElement, options)
}
