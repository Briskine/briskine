App.plugin('zendesk', (function () {
    var init = function (params, callback) {
        if (window.location.hostname.indexOf('.zendesk.com') === -1) {
            // return true as response if plugin should be activated
            return callback(null, false);
        }

        Settings.get('settings', {}, function (settings) {
            if (settings.suggestions && settings.suggestions.enabled === false) {
                return callback(null, false);
            }

            // here we're making sure that we have the current user as a client and we're not sending requests for now reason.
            chrome.runtime.sendMessage({
                'request': 'suggestion-enabled',
                'data': {
                    'domain': window.location.hostname
                }
            }, function(enabled){
                callback(null, true);

                if (enabled) {
                    injectScript();
                    load();
                }
            })
        });
    };

    // inject the zendesk script into the dom - this is done for interacting with the macro insertion
    var injectScript = function () {
        var script = document.createElement('script');
        script.type = "text/javascript";
        script.src = chrome.extension.getURL("pages/helpdesk/zendesk.js");
        if (document.body) {
            document.body.appendChild(script);
            script.onload = function () {
                document.body.removeChild(script);
            };
        }
    };

    var bindOnce = function () {
        // forward the message of usage to the bg script (for stats)
        window.addEventListener('message', function (event) {
            if (event.data && event.data.request && event.data.request === 'macro-used') {
                chrome.runtime.sendMessage({
                    'request': 'suggestion-used',
                    'data': {
                        'agent': {
                            'host': window.location.host,
                            'name': $('#face_box .name').text()
                        },
                        'url': window.location.href,
                        'template_id': event.data.template_id
                    }
                });

                var score = 0;
                if (event.data.score) {
                    score = event.data.score;
                }

                chrome.runtime.sendMessage({
                    'request': 'track',
                    'event': 'Used Macro',
                    'data': {
                        'is_suggested': score > 0,
                        'helpdesk_host': window.location.hostname,
                        'score': score
                    }
                });
            }
        });
    };

    var load = function () {
        // continuously check if our URL has changed and load the data accordingly

        //bind events only once here
        bindOnce();
        var ticketUrl = "";
        var ticketCheck = function () {
            if (window.location.pathname.indexOf('/agent/tickets/') === -1) {
                // reset the ticket url if we're not inside a ticket anymore
                ticketUrl = "";
                return;
            }
            // don't fetch for the same ticket
            if (ticketUrl === window.location.pathname) {
                return;
            }
            ticketUrl = window.location.pathname;

            $('.macro-suggestions-container').remove();

            loadEmail();
            loadMacroWidget();
        };
        setInterval(ticketCheck, 300);
    };

    // add tooltip to the email link
    var loadEmail = function () {
        var emailCheck = function() {
            var emailLink = $('a.email');
            if (emailLink.length) {
                emailLink.
                    attr('title', "Copy email shortcut: CTRL+SHIFT+C").
                    attr('data-toggle', "tooltip").
                    attr('data-html', "true").
                    attr('data-placement', "bottom");
                clearInterval(emailInterval);
            }
        };
        var emailInterval = setInterval(emailCheck, 1000);
    };

    // Populate our macro widget
    var loadMacroWidget = function () {
        // make sure we have the content loaded before inserting stuff
        var bodyCheck = function () {

            var subject = '';
            var body = '';

            var currentWorkspace = null;
            var isAgent = false;
            $('.workspace').each(function (_, workspace) {
                workspace = $(workspace);

                if (workspace.css('display') !== 'none') {
                    subject = workspace.find('input[name=subject]').val();
                    if (!(subject && subject.length)){
                        return;
                    }

                    currentWorkspace = workspace;
                    var firstEvent = workspace.find('.event-container .event.is-public:first');

                    isAgent = firstEvent.find('.user_photo').hasClass('agent');
                    body = firstEvent.find('.zd-comment').text();
                }
            });

            if (!currentWorkspace) {
                return;
            }

            clearInterval(bodyInterval);

            if (!isAgent && !subject || !subject.length || !body.length) {
                return;
            }

            // query our servers for suggestions
            chrome.runtime.sendMessage({
                'request': 'suggestion',
                'data': {
                    'agent': {
                        'host': window.location.host,
                        'name': $('#face_box .name').text()
                    },
                    'url': window.location.href,
                    'subject': subject,
                    'to': '',
                    'cc': '',
                    'bcc': '',
                    'from': '',
                    'body': body,
                    'helpdesk': 'zendesk'
                }
            }, function (suggestedMacros) {
                if (!_.size(suggestedMacros)) {
                    return;
                }

                var macroContainer = $('<div class="macro-suggestions-container">');
                $.each(suggestedMacros, function (macroIndex, macro) {
                    if (macroIndex > 2) { // show only 3 macros
                        return false;
                    }

                    var macroBtn = $("<a class='macro-suggestion'>");
                    var macroTitle = $("<span class='macro-title'>");

                    macroBtn.attr('onclick', "gorgiasApplyMacro(" + macro.external_id + ")");
                    macroBtn.attr('macro-id', macro.external_id);

                    var title = macro.body.replace(/\n/g, "<br />");
                    macroBtn.attr('title', title);
                    macroBtn.attr('data-toggle', "tooltip");
                    macroBtn.attr('data-html', "true");
                    macroBtn.attr('data-placement', "bottom");
                    macroBtn.on('mouseenter', function () {
                        // remove others
                        $('.macro-list-item').removeClass('zd-item-focus');
                        $(this).parent().addClass('zd-item-focus');
                    });

                    macroTitle.html(macro.title);
                    macroBtn.append(macroTitle);

                    macroContainer.append(macroBtn);
                });

                var before = currentWorkspace.find('.comment_input .content .options');
                if (before.length) {
                    before.before(macroContainer);
                } else {
                    currentWorkspace.find('.comment_input .content .editor:first').after('<div class="clearfix">').after(macroContainer);
                }

                chrome.runtime.sendMessage({
                    'request': 'track',
                    'event': 'Suggested macros',
                    'data': {
                        'suggested_macros_count': _.size(suggestedMacros),
                        'helpdesk_host': window.location.hostname
                    }
                });
            });
        };
        var bodyInterval = setInterval(bodyCheck, 300);
    };

    var getData = function (params, callback) {
        $('.workspace').each(function (_, workspace) {
            workspace = $(workspace);

            if (workspace.css('display') !== 'none') {

                var agent_name = $('#face_box .name').text();
                var agent_first_name = agent_name.split(' ')[0];
                var agent_last_name = agent_name.split(' ')[1];

                var name = workspace.find('span.sender').text().split('<')[0];
                var first_name = name.split(' ')[0];
                var last_name = name.split(' ')[1];

                var vars = {
                    from: [{
                        'name': agent_name,
                        'first_name': agent_first_name,
                        'last_name': agent_last_name,
                        'email': ''
                    }],
                    to: [{
                        'name': name,
                        'first_name': first_name,
                        'last_name': last_name,
                        'email': workspace.find('span.sender .email').text()
                    }],
                    cc: [],
                    bcc: [],
                    subject: workspace.find('input[name=subject]').val()
                };

                if(callback) {
                    return callback(null, vars);
                }
            }
        });
    };

    var setTitle = function (params, callback) {

    };

    return {
        init: init,
        getData: getData,
        setTitle: setTitle
    };

})());
