var VERSION = chrome.runtime.getManifest().version
var DEFAULT_RAVEN_OPTIONS = {
    ignoreErrors: [
        'SecurityError'
    ],
    release: VERSION,
    linesOfContext: 11,
    fetchContext: true
};

function ravenInit(options) {
    Raven.config('https://af2f5e9fb2744c359c19d08c8319d9c5@app.getsentry.com/30379',
        options ? $.extend(DEFAULT_RAVEN_OPTIONS, options) : DEFAULT_RAVEN_OPTIONS
    ).install();
}
