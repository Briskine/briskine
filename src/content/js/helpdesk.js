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
            var ticketUrl = "";
            var ticketInterval = setInterval(function () {
                if (window.location.pathname.indexOf('/agent/tickets/') !== -1) {
                    if (!ticketUrl || ticketUrl !== window.location.pathname) {
                        ticketUrl = window.location.pathname;

                        $('.macro-suggestions-container').remove();

                        var bodyInterval = setInterval(function () {
                            var subject = '';
                            var body = '';

                            $('.workspace').each(function (i, w) {
                                if ($(w).css('display') !== 'none') {
                                    subject = $(w).find('input[name=subject]').val();
                                    body = $(w).find('.event-container .zd-comment:first').text();
                                }
                            });

                            if (!body.length) {
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
                                    var scoreEl = $('<span class="macro-score">&nbsp;</span>');
                                    if (macro.score >= 0.8) {
                                        scoreEl.addClass('macro-score-high');
                                    }
                                    if (macro.score >= 0.6 && macro.score < 0.8) {
                                        scoreEl.addClass('macro-score-medium');
                                    }
                                    if (macro.score < 0.6) {
                                        scoreEl.addClass('macro-score-low');
                                    }

                                    macroEl.attr('onclick', "gorgiasApplyMacroSuggestion(" + macro["external_id"] + ")");
                                    macroEl.attr('title', macro.body.replace(/\n/g, "<br />"));
                                    macroEl.attr('data-toggle', "tooltip");
                                    macroEl.attr('data-html', "true");
                                    macroEl.attr('data-placement', "bottom");
                                    macroEl.html(macro.title);

                                    macroBtn.append(macroEl);
                                    macroBtn.append(scoreEl);
                                    macroContainer.append(macroBtn);
                                }
                                $('.comment_input .content .options').before(macroContainer);
                            });
                        }, 100);
                    }
                } else {
                    ticketUrl = "";
                }
            }, 100);
        }
    }
};

