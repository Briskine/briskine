if (typeof GQ == "undefined") var GQ = function(){};

GQ.tabEventFired = false;

GQ.onKeyup = function(e) {
    GQ.settings.get("autocompleteEnabled", function(enabled){
        if (!(enabled && GQ.inCompose)){
            return;
        }
        // inside the compose area of Gmail
        var source = e.srcElement;
        var isContentEditable = source.getAttribute('contenteditable') !== null

        GQ.removeAutocompleteList();

        function parseWord(value, word, startPosition, endPosition){
            // search in settings that we have the right quicktext
            GQ.settings.get('quicktexts', function(quicktexts){
                var matched = [];
                _.each(quicktexts, function(qt){
                        // if we have a shortcut that starts with that word
                        if (qt.shortcut.toLowerCase().indexOf(word) === 0) {
                            matched.push(qt);
                        }
                        // maybe we found something in the title
                        if (qt.title.toLowerCase().indexOf(word) !== -1) {
                            matched.push(qt);
                        }
                });
                GQ.showAutoCompleteDialog(word, matched, source);
            });
        }

        if (isContentEditable) {
            if (GQ.attachedIframe){ // we are in an iframe
                GQ.handleIframe(source, parseWord);
            } else { // in the 'new style' editor
                GQ.handleNewStyle(source, parseWord); 
            }
        } else { // old style plaintext editor
            GQ.handlePlainText(source, parseWord);
            var value = source.value;
        }
    });
}

GQ.onKeydown = function(e){
    if (!GQ.inCompose) {
        return;
    }
    // inside the compose area of Gmail
    var source = e.srcElement;
    var isContentEditable = source.getAttribute('contenteditable') !== null

    if (e.keyCode === 27) { //escape
        GQ.removeAutocompleteList();
    } else if (e.keyCode === 9) { //we hit Tab (keyCode: 9)
        if (GQ.tabEventFired === true) {
            GQ.tabEventFired = false;
            return;
        }
        e.preventDefault();
        e.stopPropagation();

        function parseWord(value, word, startPosition, endPosition, setValue, setPosition){
                // search in settings that we have the right quicktext
                GQ.settings.get('quicktexts', function(quicktexts){
                    var propagate = true;
                    _.each(quicktexts, function(qt){
                        if (word === qt.shortcut) { // found shortcut
                            GQ.loadVariables();
                            // remove the word
                            var before = value.substr(0, startPosition + 1);
                            var after = value.substr(endPosition);
                            var compiled = _.template(qt.body, GQ.templateVars);
                            var result = before + compiled + after;
                            result = setValue(result);
                            // set the cursor in the correct position
                            var newCursorPos = before.length + result.length;
                            setPosition(newCursorPos);
                            propagate = false;
                            return false;
                        }
                    });
                    if (propagate === true) {
                        // dispach a new tab event from the source element
                        GQ.tabEventFired = true;
                        //XXX: for some reason this event does not propagate
                        // to the next element. To be fixed.
                        GQ.triggerKeyboardEvent(source, 9);
                    }
                });
        }

        if (isContentEditable) {
            if (GQ.attachedIframe){ // we are in an iframe
                GQ.handleIframe(source, parseWord,
                function(result){
                    base.data = result;
                    return result;
                }, function(newCursorPos){
                    var range = iFrameDoc.createRange();
                    range.setStart(base, newCursorPos);
                    range.setEnd(base, newCursorPos);
                    selection.removeAllRanges();
                    selection.addRange(range);
                });
            } else { // in the 'new style' editor
                GQ.handleNewStyle(source, parseWord,
                        function(result){
                            base.data = result;
                            return result;
                        }, function(newCursorPos){
                            var range = document.createRange();
                            range.setStart(base, newCursorPos);
                            range.setEnd(base, newCursorPos);
                            selection.removeAllRanges();
                            selection.addRange(range);
                        });
           }
        } else { // old style plaintext editor
            GQ.handlePlainText(source, parseWord, function(result){
                source.value = result;
                return result;
            }, function(newCursorPos){
                source.setSelectionRange(newCursorPos, newCursorPos);
            });
            var value = source.value;
        }
    }
}

GQ.triggerKeyboardEvent = function(el, keyCode) {
    var eventObj = document.createEvent("Events");
    eventObj.initEvent("keydown", true, true);

    eventObj.keyCode = keyCode;
    eventObj.which = keyCode;
    el.dispatchEvent(eventObj);
}
