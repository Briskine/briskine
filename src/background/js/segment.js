// Create a queue, but don't obliterate an existing one!
window.analytics = window.analytics || [];

// If analytics was included show an error.
if (window.analytics.included) {
    if (window.console && console.error) {
        console.error('analytics.js included twice');
    }
} else {

    // included.
    window.analytics.included = true;

    // A list of the methods in Analytics.js to stub.
    window.analytics.methods = ['identify', 'group', 'track',
        'page', 'pageview', 'alias', 'ready', 'on', 'once', 'off',
        'trackLink', 'trackForm', 'trackClick', 'trackSubmit'];

    // Define a factory to create stubs. These are placeholders
    // for methods in Analytics.js so that you never have to wait
    // for it to load to actually record data. The `method` is
    // stored as the first argument, so we can replay the data.
    window.analytics.factory = function(method){
        return function(){
            var args = Array.prototype.slice.call(arguments);
            args.unshift(method);
            window.analytics.push(args);
            return window.analytics;
        };
    };

    // For each of our methods, generate a queueing stub.
    for (var i = 0; i < window.analytics.methods.length; i++) {
        var key = window.analytics.methods[i];
        window.analytics[key] = window.analytics.factory(key);
    }

    // Define a method to load Analytics.js from our CDN,
    // and that will be sure to only ever load it once.
    window.analytics.load = function(key){
        // Create an async script element based on your key.
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = 'https:'
            + 'cdn.segment.com/analytics.js/v1/'
            + key + '/analytics.min.js';

        // Insert our script next to the first script element.
        var first = document.getElementsByTagName('script')[0];
        first.parentNode.insertBefore(script, first);
    };

    // Add a version to keep track of what's in the wild.
    window.analytics.SNIPPET_VERSION = '2.0.9';

    // Load Analytics.js with your key, which will automatically
    // load the tools you've enabled for your account. Boosh!
    window.analytics.load('hjKs9HLt7C');

    // Make the first page call to load the integrations. If
    // you'd like to manually name or tag the page, edit or
    // move this call however you'd like.

}
window.analytics.page();