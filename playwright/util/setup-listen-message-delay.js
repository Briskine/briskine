
let counterListener = 0
let listenerNr

let messageListener = (e) => {
    if (e?.data === 'briskine-ready') {
        counterListener++

        if (counterListener >= listenerNr) {
            // eslint-disable-next-line no-console
            console.log('BSKN inited')
        }
    }
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
let setupListenMessage = () => {
    listenerNr = 1 + document.querySelectorAll('iframe').length

    window.addEventListener('message', messageListener)

    document.querySelectorAll('iframe').forEach((iframeElem) =>
        iframeElem.contentWindow.addEventListener('message', messageListener)
    )
}
