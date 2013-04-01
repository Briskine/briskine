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
    var inCompose = false;
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
            var value = source.value;
            var start_position = 0; // where the word begings so we can replace it
            var end_position = e.srcElement.selectionStart;
            var word = '';
            // find the previous word before the tab
            for (var i = end_position - 1; i >= 0; i--) {
               if (_.str.isBlank(value[i])){
                   break;
               }
               word = _.str.insert(word, 0, value[i]);
            }
            start_position = i;
            if (word) {
                // search in settings that we have the right quicktext
                _.each(settings.get('quicktexts'), function(qt){
                    if (word === qt.shortcut) { // found shortcut
                        loadVariables();
                        // remove the word
                        var before = value.substr(0, start_position + 1);
                        var after = value.substr(end_position);
                        var compiled = _.template(qt.template, templateVars);
                        source.value = before + compiled + after;
                        // set the cursor in the correct position
                        var newCursorPos = before.length + compiled.length;
                        source.setSelectionRange(newCursorPos, newCursorPos); 
                    }
                });
            }
        }
    }
    function onFocusCapturePhase(e){
        var focusedEl = e.target;
        // <textarea id=":nx"
        if (focusedEl.getAttribute('aria-label') == 'Text area for composing a reply') {
            inCompose = true;
        }
    }

    function onBlurCapturePhase(e){
        var focusedEl = e.target;
        // <textarea id=":nx"
        if (focusedEl.getAttribute('aria-label') != 'Text area for composing a reply') {
            inCompose = false;
        }
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
    settings.load();
    window.addEventListener("DOMContentLoaded", initializeOnDomReady);
}).call(this);
