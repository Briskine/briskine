// template storage

var TemplateStorage = {
    set: function(data, callback) {
        chrome.storage.local.set(data, callback);
    },
    get: function(k, callback) {
        chrome.storage.local.get(k, callback);
    },
    remove: function(k, callback) {
        chrome.storage.local.remove(k, callback);
    },
    clear: function(callback) {
        chrome.storage.local.clear(callback);
    }
};
