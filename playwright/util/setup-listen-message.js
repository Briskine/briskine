
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

let setupListenMessage = () => {
    listenerNr = 1 + document.querySelectorAll('iframe').length

    window.addEventListener('message', messageListener)

    document.querySelectorAll('iframe').forEach((iframeElem) =>
        iframeElem.contentWindow.addEventListener('message', messageListener)
    )
}

document.onreadystatechange = function()
{
    if (document.readyState === 'complete')
    {
        setupListenMessage()
    }
}
