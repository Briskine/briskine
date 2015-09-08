/**
 * Heldesks' code (Zendesk, Desk etc..)
 */

App.helpdesk = {
    init: function () {
        // fetch template content from the extension
        if (window.location.hostname.indexOf('zendesk.com') !== -1) {
            App.helpdesk.zendesk.init();
        }
        if (window.location.hostname.indexOf('desk.com') !== -1) {
            App.helpdesk.desk.init();
        }
    },
    zendesk: {
        init: function () {
            // inject the zendesk script into the dom
            var script = document.createElement('script');
            script.type = "text/javascript";
            script.src = chrome.extension.getURL("pages/helpdesk/zendesk.js");
            if (document.body) {
                document.body.appendChild(script);
                script.onload = function () {
                    document.body.removeChild(script);
                };
            }

            // forward the message to the
            window.addEventListener('message', function (event) {
                if (event.data && event.data.request && event.data.request === 'suggestion-used') {
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
                }
            });

            var ticketUrl = "";
            var ticketCheck = function () {
                if (window.location.pathname.indexOf('/agent/tickets/') === -1) {
                    return;
                }

                if (!ticketUrl || ticketUrl === window.location.pathname) {
                    ticketUrl = "";
                    return;
                }

                ticketUrl = window.location.pathname;

                $('.macro-suggestions-container').remove();

                var bodyCheck = function () {
                    var subject = '';
                    var body = '';

                    $('.workspace').each(function (i, workspace) {
                        workspace = $(workspace);

                        if (workspace.css('display') !== 'none') {
                            var firstEvent = workspace.find('.event-container .event.is-public:first');
                            var isAgent = firstEvent.find('.user_photo').hasClass('agent');

                            // If it's an agent who has the last comment no point in suggesting anything
                            if (isAgent) {
                                return false;
                            }

                            subject = workspace.find('input[name=subject]').val();
                            body = firstEvent.find('.zd-comment').text();
                        }
                    });

                    if (!subject || !subject.length || !body.length) {
                        return;
                    }

                    clearInterval(bodyInterval);

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
                    }, function (macros) {
                        if (!_.size(macros)) {
                            return;
                        }

                        $('.macro-suggestions-container').remove();
                        var macroContainer = $("<div class='macro-suggestions-container'>");

                        for (var i in macros) {
                            var macro = macros[i];
                            var macroBtn = $("<a class='macro-suggestion'>");
                            var macroEl = $("<span class='macro-title'>");
                            /*
                             var scoreEl = $('<span class="macro-score">&nbsp;</span>');
                             if (macro.score >= 0.9) {
                             scoreEl.addClass('macro-score-high');
                             }
                             if (macro.score >= 0.7 && macro.score < 0.9) {
                             scoreEl.addClass('macro-score-medium');
                             }
                             if (macro.score < 0.7) {
                             scoreEl.addClass('macro-score-low');
                             }
                             */

                            macroBtn.attr('onclick', "gorgiasApplyMacroSuggestion(" + macro["external_id"] + ")");
                            macroBtn.attr('title', macro.body.replace(/\n/g, "<br />"));
                            macroBtn.attr('data-toggle', "tooltip");
                            macroBtn.attr('data-html', "true");
                            macroBtn.attr('data-placement', "bottom");
                            macroEl.html(macro.title);

                            macroBtn.append(macroEl);
                            //macroBtn.append(scoreEl);
                            macroContainer.append(macroBtn);
                        }
                        $('.comment_input .content .options').before(macroContainer);
                    });
                };
                var bodyInterval = setInterval(bodyCheck, 200);
            };
            var ticketInterval = setInterval(ticketCheck, 200);
        }
    },
    desk: {
        init: function () {
            // inject the zendesk script into the dom
            var script = document.createElement('script');
            script.type = "text/javascript";
            script.src = chrome.extension.getURL("pages/helpdesk/desk.js");
            if (document.body) {
                document.body.appendChild(script);
                script.onload = function () {
                    document.body.removeChild(script);
                };
            }

            // forward the message to the
            window.addEventListener('message', function (event) {
                if (event.data && event.data.request && event.data.request === 'suggestion-used') {
                    chrome.runtime.sendMessage({
                        'request': 'suggestion-used',
                        'data': {
                            'agent': {
                                'host': window.location.host,
                                'name': $('#systembar-user-settings-nav>.a-gravatar>span').text()
                            },
                            'url': window.location.href,
                            'template_id': event.data.template_id
                        }
                    });
                }
            });

            // check if we are in a ticket at regular intervals
            var ticketId = '';
            var caseCheck = function () {
                var activeTicket = $('.active_ticket_type:not(.ui-tabs-hide)');

                // if we're on the same ticket no need to fetch the data again
                if (!activeTicket.length || ticketId === activeTicket.attr('id')) {
                    return;
                }

                ticketId = activeTicket.attr('id');

                var subject = activeTicket.find('.a-ticket-subject').text().trim();
                var body = activeTicket.find('.a-ticket-meat').text();

                if (!subject || !subject.length || !body.length) {
                    return;
                }

                chrome.runtime.sendMessage({
                    'request': 'suggestion',
                    'data': {
                        'agent': {
                            'host': window.location.host,
                            'name': $('#systembar-user-settings-nav>.a-gravatar>span').text()
                        },
                        'url': window.location.href,
                        'subject': subject,
                        'to': '',
                        'cc': '',
                        'bcc': '',
                        'from': '',
                        'body': body,
                        'helpdesk': 'desk'
                    }
                }, function (macros) {
                    if (!_.size(macros)) {
                        return;
                    }

                    $('.macro-suggestions-container').remove();
                    var macroContainer = $("<div class='macro-suggestions-container'>");
                    macroContainer.css('margin-left', '63px');
                    macroContainer.css('margin-top', '0px');

                    for (var i in macros) {
                        var macro = macros[i];
                        var macroBtn = $("<button class='macro-suggestion a-grey-button'>");
                        var macroEl = $("<span class='macro-title'>");

                        macroBtn.attr('onclick', "gorgiasApplyMacroSuggestion(" + macro["external_id"] + ")");
                        macroBtn.attr('title', macro.body);
                        macroEl.html(macro.title);

                        macroBtn.append(macroEl);
                        macroContainer.append(macroBtn);
                    }
                    $('.a-ticket-reply .a-float-wrap').after(macroContainer);
                });
            };
            var caseInterval = setInterval(caseCheck, 200);
        }
    }
};
