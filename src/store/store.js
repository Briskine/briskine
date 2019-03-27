var store = function () {
    var plugin = _GORGIAS_API_PLUGIN;

    // respond to content
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
        if (
            req.type
            && typeof plugin[req.type] === 'function'
        ) {
            plugin[req.type](req.data).then((data) => {
                console.log('send', req, data)
                if (typeof data !== 'undefined') {
                    sendResponse(data);
                }
            }).catch((err) => console.err(err))
        }

        return true;
    });

    return plugin;
}();
