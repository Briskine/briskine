/* Outlook plugin
 */

App.plugin('outlook', (function() {
    var parseName = function(name) {
        name = name.trim();

        var first_name = '';
        var last_name = '';

        var firstSpace = name.indexOf(' ');

        if(firstSpace === -1) {
            firstSpace = name.length;
        }

        first_name = name.substring(0, firstSpace);
        last_name = name.substring(firstSpace + 1, name.length);

        return {
            first_name: first_name,
            last_name: last_name
        };
    };

    var getFieldData = function(field, $container) {
        var $buttons = $container.querySelectorAll('[class*="wellItemText-"]') || [];
        $buttons.forEach(function ($button) {
            var fullName = $button.innerText || '';
            field.push(
                Object.assign({
                    name: fullName,
                    first_name: '',
                    last_name: '',
                    // BUG we can't get email
                    email: ''
                }, parseName(fullName))
            );
        });
    };

    var getContainerSelector = function () {
        return '._1snD8ht9jkLT9zDWn6Ef-6';
    };

    var getContainers = function () {
        return document.querySelectorAll(getContainerSelector()) || [];
    };

    var getSuggestionSelector = function () {
        // "use this address" not in contact list
        var headerSelector = `.ms-Suggestions-headerContainer [class*="useAddressContainer-"]`;
        // contact list suggestion
        var listSelector = `.ms-Suggestions-container [role="listitem"]`;

        return `${headerSelector}, ${listSelector}`;
    };

    var getSubjectField = function () {
        return document.querySelector('._1lMDXhNZeGHitcMyCa9TJp input[type=text]');
    };

    var getContactField = function ($container) {
        return $container.querySelector('[role="combobox"]');
    };

    var waitForElement = function (selector) {
        return new Promise((resolve, reject) => {
            var selectorObserver = new MutationObserver(function (records, observer) {
                var $suggestion = document.querySelector(selector);
                if ($suggestion) {
                    observer.disconnect();
                    resolve($suggestion);
                }
            });
            selectorObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    };

    var fieldUpdateQueue = [];
    var updateContactField = function ($field, value, $editor) {
        // wait for previous contact field update
        fieldUpdateQueue.push(
            Promise.all(fieldUpdateQueue).then(() => {
                $field.value = value;
                $field.dispatchEvent(new Event('input', {bubbles: true}));

                return waitForElement(getSuggestionSelector()).then(function ($element) {
                    // BUG only works once per field
                    $field.dispatchEvent(
                        new KeyboardEvent('keydown', {
                            keyCode: 13,
                            which: 13,
                            bubbles: true
                        })
                    );

                    // restore focus
                    $editor.focus();
                    return;
                });
            })
        );
    };

    // get all required data from the dom
    var getData = function(params, callback) {
        var vars = {
            from: [],
            to: [],
            cc: [],
            bcc: [],
            subject: ''
        };

        var $containers = getContainers();
        var $from = $containers[0];
        if ($from) {
            var $fromButton = $from.querySelector('[role=button]');
            if ($fromButton) {
                var fromEmail = $fromButton.innerText || '';
                var nameAriaLabel = $fromButton.getAttribute('aria-label');
                // BUG only works for two word names
                var fromName = nameAriaLabel.split(' ').slice(-2).join(' ');

                vars.from.push(
                    Object.assign({
                        name: fromName,
                        first_name: '',
                        last_name: '',
                        email: fromEmail
                    }, parseName(fromName))
                );
            }
        }

        var $to = $containers[1];
        if ($to) {
            getFieldData(vars.to, $to);
        }

        var $cc = $containers[2];
        if ($cc) {
            getFieldData(vars.cc, $cc);
        }

        var $bcc = $containers[3];
        if ($bcc) {
            getFieldData(vars.bcc, $bcc);
        }

        if(callback) {
            callback(null, vars);
        }
    };

    var before = function (params, callback) {
        // don't do anything if we don't have any extra fields
        if (!params.quicktext.subject &&
            !params.quicktext.to &&
            !params.quicktext.cc &&
            !params.quicktext.bcc
        ) {
            return callback(null, params);
        }

        var $subject = getSubjectField();
        var parsedSubject = Handlebars.compile(params.quicktext.subject)(PrepareVars(params.data));
        $subject.value = parsedSubject;
        $subject.dispatchEvent(new Event('input', {bubbles: true}));

        var $containers = getContainers();

        var $to = $containers[1];
        if (params.quicktext.to && $to) {
            var $toInput = getContactField($to);
            var parsedTo = Handlebars.compile(params.quicktext.to)(PrepareVars(params.data));
            updateContactField($toInput, parsedTo, params.element);
        }

        var $cc = $containers[2];
        if (params.quicktext.cc) {
            var parsedCc = Handlebars.compile(params.quicktext.cc)(PrepareVars(params.data));
            if ($cc) {
                var $ccInput = getContactField($cc);
                updateContactField($ccInput, parsedCc, params.element);
            } else {
                // click CC button
                $containers[0].querySelector('button:first-of-type').click();
                waitForElement(`${getContainerSelector()}:nth-of-type(3)`).then(($container) => {
                    var $ccInput = getContactField($container);
                    updateContactField($ccInput, parsedCc, params.element);
                });
            }
        }

        var $bcc = $containers[3];
        if (params.quicktext.bcc) {
            var parsedBcc = Handlebars.compile(params.quicktext.bcc)(PrepareVars(params.data));
            if ($bcc) {
                var $bccInput = getContactField($bcc);
                updateContactField($bccInput, parsedBcc, params.element);
            } else {
                // click BCC button
                $containers[0].querySelector('button:last-of-type').click();
                waitForElement(`${getContainerSelector()}:nth-of-type(4)`).then(($container) => {
                    var $bccInput = getContactField($container);
                    updateContactField($bccInput, parsedBcc, params.element);
                });
            }
        }

        if(callback) {
            callback(null, params);
        }
    };

    var init = function(params, callback) {
        var outlookUrl = 'outlook.live.com/';

        var activateExtension = false;

        // trigger the extension based on url
        if(window.location.href.indexOf(outlookUrl) !== -1) {
            activateExtension = true;
        }

        // return true as response if plugin should be activated
        if(callback) {
            // first param is the error
            // second is the response
            callback(null, activateExtension);
        }
    };

    return {
        init: init,
        getData: getData,
        before: before
    };
})());
