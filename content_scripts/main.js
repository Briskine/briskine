function GQ(){}; // define a namespace

// these variables are used to populate fields in the quicktext templates
GQ.templateVars = {
    // 'From' field
    'from': {
        'name': '',
        'first_name': '',
        'last_name': '',
        'email': ''
    },
    // 'To' field. It's a list of dictionaries containing the same fields as 'From' field
    'to': [],
    // Same as 'To' field
    'cc': [],
    // Same as 'To' field
    'bcc': [],
    // 'Subject' field
    'subject': ""
};

GQ.inCompose = false; // are we in a compose field
GQ.attachedIframe = false; // have we attached events to the edit iframe?

// handling messages for settings via chrome.estension
GQ.settings = {
    get: function(key, callback) {
        chrome.runtime.sendMessage({'request': 'get', 'data': key}, function(response) {
            callback(response);
        });
    },
    set: function(key, value) {
        chrome.runtime.sendMessage({'request': 'set', 'data': {key: value}}, function(response) {
            callback(response);
        });
    },
};

GQ.onKeydown = function(e){
    // inside the compose area of Gmail and we hit Tab (keyCode: 9)
    if (e.keyCode === 9 && GQ.inCompose === true) {
        e.preventDefault();
        e.stopPropagation();
        var source = e.srcElement;
        var isContentEditable = source.getAttribute('contenteditable') !== null

        if (isContentEditable) {
            if (GQ.attachedIframe){ // we are in an iframe
                handleIframe(source);
            } else { // in the 'new style' editor
                handleNewStyle(source); 
            }
        } else { // old style plaintext editor
            handlePlainText(source);
            var value = source.value;
        }

        function getWord(value, end_position){
            var word = '';
            // find the previous word before the tab
            for (var i = end_position - 1; i >= 0; i--) {
                if (_.str.isBlank(value[i])){
                    break;
                }
                word = _.str.insert(word, 0, value[i]);
            }
            start_position = i; 
            return [word, start_position];
        }

        function parseWord(value, word, start_position, end_position, setValue, setPosition){
                // search in settings that we have the right quicktext
                GQ.settings.get('quicktexts', function(quicktexts){
                    _.each(quicktexts, function(qt){
                        if (word === qt.shortcut) { // found shortcut
                            GQ.loadVariables();
                            // remove the word
                            var before = value.substr(0, start_position + 1);
                            var after = value.substr(end_position);
                            var compiled = _.template(qt.body, GQ.templateVars);
                            var result = before + compiled + after;
                            setValue(result);
                            // set the cursor in the correct position
                            var newCursorPos = before.length + compiled.length;
                            setPosition(newCursorPos);
                        }
                    });
                });
        }

        function handlePlainText(source){
            var value = source.value;
            var start_position = 0; // where the word begings so we can replace it
            var end_position = source.selectionStart;
            var res = getWord(value, end_position)
            var word = res[0];
            start_position = res[1];

            if (word) {
                parseWord(value, word, start_position, end_position, function(result){
                    source.value = result;
                }, function(newCursorPos){
                    source.setSelectionRange(newCursorPos, newCursorPos);
                })
            }
        }

        function handleIframe(source){
            var start_position = 0; // where the word begings so we can replace it
            var iFrameDoc = source.parentNode.parentNode;
            var selection = iFrameDoc.getSelection();
            var base = selection.baseNode;
            var value = base.data;
            var end_position = selection.baseOffset;

            var res = getWord(value, end_position)
            var word = res[0];
            start_position = res[1];
            if (word) {
                parseWord(value, word, start_position, end_position, function(result){
                    base.data = result;
                }, function(newCursorPos){
                    var range = iFrameDoc.createRange();
                    range.setStart(base, newCursorPos);
                    range.setEnd(base, newCursorPos);
                    selection.removeAllRanges();
                    selection.addRange(range);
                })
            }
        }

        function handleNewStyle(source){
            var start_position = 0; // where the word begings so we can replace it
            var selection = document.getSelection();
            var base = selection.baseNode;
            var value = base.data;
            var end_position = selection.baseOffset;

            var res = getWord(value, end_position)
            var word = res[0];
            start_position = res[1];
            if (word) {
                parseWord(value, word, start_position, end_position, function(result){
                    base.data = result;
                }, function(newCursorPos){
                    var range = document.createRange();
                    range.setStart(base, newCursorPos);
                    range.setEnd(base, newCursorPos);
                    selection.removeAllRanges();
                    selection.addRange(range);
                })
            }
        }
    }
}

GQ.onFocusCapturePhase = function(e){
    var focusedEl = e.target;
    if (focusedEl.getAttribute('form') == 'nosend' || // Plaintext
        focusedEl.classList.contains('editable')) {//Richtext
        GQ.inCompose = true;
    }
}

GQ.onBlurCapturePhase = function(e){
    var focusedEl = e.target;
    if (!(focusedEl.getAttribute('form') == 'nosend' || // Plaintext
        focusedEl.classList.contains('editable'))) {//Richtext
        GQ.inCompose = false;
    }
    GQ.attachEventsToIframe();
}
// given a string like: Alex P <alex@gmail-quicktext.com> return a dict:
// {'name': 'Alex P', 'first_name': 'Alex', 'last_name': 'P', 'email': 'alex@gmail-quicktext.com'}
GQ.parseFields = function(str){
    var re = /"?([^ ]*)\s*(.*)"?\s*<([^>]+)>/
    var matches = re.exec(str)
    // return empty by default
    var ret = {
        'name': '',
        'first_name': '',
        'last_name': '',
        'email': ''
    }
    if (matches){
        var first_name = _.str.trim(matches[1].replace('"', ''));
        var last_name = _.str.trim(matches[2].replace('"', ''));
        ret['name'] = first_name + " " + last_name;
        ret['first_name'] = first_name;
        ret['last_name'] = last_name;
        ret['email'] = matches[3];
        return ret;
    }
    // we didn't have a match. So let's match at least the e-mail
    var email_re = /([\w!.%+\-])+@([\w\-])+(?:\.[\w\-]+)+/;
    var matches = email_re.exec(str);
    if (matches){
        ret['email'] = matches[0];
    }

    return ret;
}
GQ.loadVariables = function(){
    //TODO: fix new style to fields
    function loadToField(field){
        // clean first
        GQ.templateVars[field] = []
        var fieldEl = document.querySelector("textarea[name='"+ field +"']")
        if (fieldEl) {
            emails = fieldEl.value.split(',');
            for (i in emails){
                var fields = GQ.parseFields(emails[i])
                if (fields){
                    GQ.templateVars[field].push(fields);
                }
            }
        }
    }
    // 'To' field
    loadToField('to');
    loadToField('cc');
    loadToField('bcc');
    // 'From' field - works if we have a multiple from fields.
    var from = document.querySelectorAll("select[name='from'] option[selected='selected']")[0];
    // 'From' that will be taken from the the Me+ field
    var fromPlus = document.querySelectorAll('a[href^="https://plus.google.com/u/0/"]');
    if (from) {
        GQ.templateVars.from = GQ.parseFields(from.text);
    } else if (fromPlus){
        //_.each()
    }
    var subject = document.querySelector("input[name='subject']");
    if (subject) {
        GQ.templateVars.subject = subject.value;
    }
}

GQ.initializeOnDomReady = function(){
    document.addEventListener("keydown", GQ.onKeydown, true);
    document.addEventListener("focus", GQ.onFocusCapturePhase, true);
    document.addEventListener("blur", GQ.onBlurCapturePhase, true);
}

GQ.attachEventsToIframe = function(){
    var iframe = document.querySelector('iframe.editable');
    if (!GQ.attachedIframe && iframe) {
        iframe.contentDocument.addEventListener("keydown", GQ.onKeydown, true)
        iframe.contentDocument.addEventListener("focus", GQ.onFocusCapturePhase, true)
        iframe.contentDocument.addEventListener("blur", GQ.onBlurCapturePhase, true)
        GQ.attachedIframe = true;
    }
}


window.addEventListener("DOMContentLoaded", GQ.initializeOnDomReady);
