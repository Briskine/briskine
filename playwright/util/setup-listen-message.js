window.addEventListener('message', (e) => {
    if (e?.data === 'briskine-ready') {
        // eslint-disable-next-line no-console
        console.log('BSKN inited')
    }
})
