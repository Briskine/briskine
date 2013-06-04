if (typeof GQ == "undefined") var GQ = function(){};

GQ.tabEventFired = false;

GQ.onKeyup = function(e) {
    // Only in compose area in Gmail
    if (!GQ.inCompose) {
        return;
    }

    // execute only if autocomplete dialog is active
    if (GQ.au.active) {
        if (e.keyCode === 27) { // escape
            e.preventDefault();
            e.stopPropagation();
            GQ.au.remove();
        } else if (e.keyCode === 13) { // enter
            GQ.au.complete();
        } else if (e.keyCode === 38) { // arrow up
            GQ.au.move("up");
        } else if (e.keyCode === 40) { // arrow down
            GQ.au.move("down");
        }
    }

    // if the autocomplete dialog is enabled in settings
    GQ.settings.get("autocompleteEnabled", function(enabled){
        if (!enabled) {
            return;
        }
        var source = e.srcElement;

        // remove autocomplete dialog if any
        GQ.au.remove();

        function parseWord(params){
            // search in settings that we have the right quicktext
            GQ.settings.get('quicktexts', function(quicktexts){
                var matched = [];
                _.each(quicktexts, function(qt){
                        // if we have a shortcut that starts with that word
                        if (qt.shortcut.toLowerCase().indexOf(params['word']) === 0) {
                            matched.push(qt);
                        } else if (qt.title.toLowerCase().indexOf(params['word']) !== -1) {
                            // maybe we found something in the title 
                            matched.push(qt);
                        }
                });
                GQ.au.show(params['word'], matched, source);
            });
        }

        if (GQ.isContentEditable) {
            if (GQ.attachedIframe){ // we are in an iframe
                GQ.handleIframe(source, parseWord);
            } else { // in the 'new style' editor
                GQ.handleNewStyle(source, parseWord);
            }
        } else { // old style plaintext editor
            GQ.handlePlainText(source, parseWord);
        }
    });
};

GQ.onKeydown = function(e){
    // Only in compose area in Gmail
    if (!GQ.inCompose) {
        return;
    }

    var source = e.srcElement;
    if (e.keyCode === 9) { // Tab key
        GQ.au.tab(e, source);
    }
};
