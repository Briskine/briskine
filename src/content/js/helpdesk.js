/**
 * Heldesks' code (Zendesk, etc..)
 */

App.helpdesk = {
    init: function () {
        // fetch template content from the extension
        if (window.location.hostname.indexOf('zendesk.com') !== -1) {
            App.helpdesk.zendesk.init();
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
            window.addEventListener('message', function(event) {
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
            var ticketInterval = setInterval(function () {
                if (window.location.pathname.indexOf('/agent/tickets/') !== -1) {
                    if (!ticketUrl || ticketUrl !== window.location.pathname) {
                        ticketUrl = window.location.pathname;

                        $('.macro-suggestions-container').remove();

                        var bodyInterval = setInterval(function () {
                            var subject = '';
                            var body = '';

                            $('.workspace').each(function (i, workspace) {
                                workspace = $(workspace);

                                if (workspace.css('display') !== 'none') {
                                    var firstEvent = workspace.find('.event-container .event:first');
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
                        }, 200);
                    }
                } else {
                    ticketUrl = "";
                }
            }, 200);
        }
    }
};

