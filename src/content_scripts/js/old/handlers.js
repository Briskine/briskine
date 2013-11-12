var onMessage = chrome.runtime.onMessage || chrome.extension.onMessage;

onMessage.addListener(
function(request, sender, sendResponse) {
    // insert quicktext
    if (request.action && request.action == 'insert'){
        var quicktextId = request.id;
        var source = null;
        if (GQ.inCompose) {
            // try to find a textarea that is editable (plaintext)
            if (GQ.isContentEditable) {
                if (GQ.attachedIframe) {
                    if ($('iframe.editable').length) {
                        var frameDoc = $($('iframe.editable')[0].contentDocument)
                        var body = frameDoc.find('body.editable');
                        if (body.length){
                            source = body[0];
                        }
                    }
                } else if ($('div.editable[contenteditable]').length){
                    source = $('div.editable[contenteditable]')[0];
                }
            } else {
                if ($('textarea[form=nosend]').length) {
                    source = $('textarea[form=nosend]')[0];
                }
            }

            function parseWord(params, setValue, setPosition) {
                    // search in settings that we have the right quicktext
                    GQ.settings.get('quicktexts', function(quicktexts){
                        _.each(quicktexts, function(qt){
                            if (quicktextId === qt.id) { // found shortcut
                                GQ.loadVariables();
                                // remove the word
                                var before = params.value.substr(0, params.startPosition + 1);
                                var after = params.value.substr(params.endPosition);
                                var compiled = _.template(qt.body, GQ.templateVars);
                                var result = before + compiled + after;
                                result = setValue(params, result);
                                // set the cursor in the correct position
                                var newCursorPos = before.length + result.length;
                                setPosition(params, newCursorPos);
                                return false; // stop the loop
                            }
                        });
                    });
            }

            if (source){
                GQ.au.handleInsertion(source, parseWord);
            }
        }
    }
});
