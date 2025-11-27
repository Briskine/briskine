
let messageListener = (e) => {
    if (e?.data === 'briskine-ready') {
        // eslint-disable-next-line no-console
        console.log('BSKN inited')
    }
}

window.addEventListener('message', messageListener)

let setupListenMessage = () => {
    document.querySelectorAll("iframe").forEach((iframeElem) =>
        iframeElem.contentWindow.addEventListener('message', messageListener)
    )
}

document.onreadystatechange = function()
{
    if (document.readyState === 'complete')
    {
        setupListenMessage()
    }
};
