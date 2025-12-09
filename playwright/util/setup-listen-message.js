
const promiseMainWindow = new Promise((resolve) => {
    window.addEventListener('message', (e) => { 
        if (e?.data === 'briskine-ready') {
            resolve(true)
        }
    })
})

const promiseDocumentReady = new Promise((resolve) => {
    document.onreadystatechange = () => {
        if (document.readyState === 'complete')
        {
            const iframes = document.querySelectorAll('iframe')

            if (iframes.length) {
                Promise.all(
                    [...iframes].map((iframeElem) => new Promise((resolve) => {
                            iframeElem.contentWindow.addEventListener('message', (e) => {
                                if (e?.data === 'briskine-ready') {
                                    resolve(true)
                                }
                            })
                        })
                    )
                ).then(() => { 
                    resolve(true)
                } )
            } else {
                resolve(true)
            }
        }
    }
})

Promise.all([promiseMainWindow, promiseDocumentReady]).then(() => {
    // eslint-disable-next-line no-console
    console.log('BSKN inited')
})
