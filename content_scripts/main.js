(function() {
    // these variables are used to populate fields in the quicktext templates
    var templateVars = {
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

    var inCompose = false; // are we in a compose field
    var attachedIframe = false; // have we attached events to the edit iframe?
    // handling messages for settings via chrome.estension
    var settings = {
        port: null,
        values: {},
        loadedValues: 0,
        valuesToLoad: ["quicktexts"],
        isLoaded: false,
        eventListeners: {},
        init: function() {
            this.port = chrome.extension.connect({ name: "settings" });
            return this.port.onMessage.addListener(this.receiveMessage);
        },
        get: function(key) {
            return this.values[key];
        },
        set: function(key, value) {
            if (!this.port) {
                this.init();
            }
            this.values[key] = value;
            return this.port.postMessage({
                operation: "set",
                key: key,
                value: value
            });
        },
        load: function() {
            var i, _results;
            if (!this.port) {
                this.init();
            }
            _results = [];
            for (i in this.valuesToLoad) {
                _results.push(this.port.postMessage({
                    operation: "get",
                    key: this.valuesToLoad[i]
                }));
            }
            return _results;
        },
        receiveMessage: function(args) {
            settings.values[args.key] = args.value;
        },
        addEventListener: function(eventName, callback) {
            if (!(eventName in this.eventListeners)) {
                this.eventListeners[eventName] = [];
            }
            return this.eventListeners[eventName].push(callback);
        }
    };

    function onKeydown(e){
        // inside the compose area of Gmail and we hit Tab (keyCode: 9)
        if (e.keyCode === 9 && inCompose === true){
            e.preventDefault();
            var source = e.srcElement;
            var isContentEditable = source.getAttribute('contenteditable') !== null

            if (isContentEditable) {
                if (attachedIframe){ // we are in an iframe
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
                    _.each(settings.get('quicktexts'), function(qt){
                        if (word === qt.shortcut) { // found shortcut
                            loadVariables();
                            // remove the word
                            var before = value.substr(0, start_position + 1);
                            var after = value.substr(end_position);
                            var compiled = _.template(qt.template, templateVars);
                            var result = before + compiled + after;
                            setValue(result);
                            // set the cursor in the correct position
                            var newCursorPos = before.length + compiled.length;
                            setPosition(newCursorPos);
                        }
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
                        //TODO: fix setting the selection
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
                        //TODO: fix setting the selection
                    })
                }
            }
        }
    }

    function onFocusCapturePhase(e){
        var focusedEl = e.target;
        if (focusedEl.getAttribute('form') == 'nosend' || // Plaintext
            focusedEl.classList.contains('editable')) {//Richtext
            inCompose = true;
        }
    }

    function onBlurCapturePhase(e){
        var focusedEl = e.target;
        if (!(focusedEl.getAttribute('form') == 'nosend' || // Plaintext
            focusedEl.classList.contains('editable'))) {//Richtext
            inCompose = false;
        }
        attachEventsToIframe();
    }
    // given a string like: Alex P <alex@gmail-quicktext.com> return a dict:
    // {'name': 'Alex P', 'first_name': 'Alex', 'last_name': 'P', 'email': 'alex@gmail-quicktext.com'}
    function parseFields(str){
        var re = /"?([^ ]*)\s*(.*)"?\s*<([^>]+)>/
        var matches = re.exec(str)
        if (matches){
            var first_name = matches[1].replace('"', '').replace(" ", '');
            var last_name = matches[2].replace('"', '').replace(" ", '');
            return {
                'name': first_name + " " + last_name,
                'first_name': first_name,
                'last_name': last_name,
                'email': matches[3],
            }

        }
        return null;
    }
    function loadVariables(){
        //TODO: fix new style to fields
        function loadToField(field){
            // clean first
            templateVars[field] = []
            var fieldEl = document.querySelector("textarea[name='"+ field +"']")
            if (fieldEl) {
                emails = fieldEl.value.split(',');
                for (i in emails){
                    var fields = parseFields(emails[i])
                    if (fields){
                        templateVars[field].push(fields);
                    }
                }
            }
        }
        // 'To' field
        loadToField('to');
        loadToField('cc');
        loadToField('bcc');
        // 'From' field
        var from = document.querySelectorAll("select[name='from'] option[selected='selected']")[0];
        if (from) {
            templateVars.from = parseFields(from.text);
        }
        var subject = document.querySelector("input[name='subject']");
        if (subject) {
            templateVars.subject = subject.value;
        }
    }

    function initializeOnDomReady(){
        document.addEventListener("keydown", onKeydown, true);
        document.addEventListener("focus", onFocusCapturePhase, true);
        document.addEventListener("blur", onBlurCapturePhase, true);

    }
    function attachEventsToIframe(){
        var iframe = document.querySelector('iframe.editable');
        if (!attachedIframe && iframe) {
            iframe.contentDocument.addEventListener("keydown", onKeydown, true)
            iframe.contentDocument.addEventListener("focus", onFocusCapturePhase, true)
            iframe.contentDocument.addEventListener("blur", onBlurCapturePhase, true)
            attachedIframe = true;
        }
    }
    settings.load();
    window.addEventListener("DOMContentLoaded", initializeOnDomReady);
}).call(this);
