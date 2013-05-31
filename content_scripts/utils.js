if (typeof GQ == "undefined") var GQ = function(){};

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

GQ.getWord = function (value, endPosition) {
    var word = '';
    // find the previous word before the tab
    for (var i = endPosition - 1; i >= 0; i--) {
        if (_.str.isBlank(value[i])){
            break;
        }
        word = _.str.insert(word, 0, value[i]);
    }
    startPosition = i;
    return [word, startPosition];
};
