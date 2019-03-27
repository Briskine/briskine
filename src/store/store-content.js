var store = function () {
    function createRequest (type) {
        return (params) => {
            return new Promise((resolve, reject) => {
                // get from background
                chrome.runtime.sendMessage({
                    type: type,
                    data: params
                }, resolve)
            }).catch((err) => console.error(err))
        }
    }

    var methods = [
        'getSettings',
        'setSettings'
    ];
    var contentStore = {};
    methods.forEach((method) => {
        contentStore[method] = createRequest(method)
    });
    return contentStore
}();
