App.plugin('desk', (function () {
    var init = function (params, callback) {
        if ($('link[href^=https\\:\\/\\/cdn\\.desk\\.com]').length === 0) {
            // return true as response if plugin should be activated
            return callback(null, false);
        }
    };

    var injectScript = function () {
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
                var activeTicket = $('.active_ticket_type:not(.ui-tabs-hide)');
                chrome.runtime.sendMessage({
                    'request': 'suggestion-used',
                    'data': {
                        'agent': {
                            'host': window.location.host,
                            'name': $('#systembar-user-settings-nav>.a-gravatar>span').text()
                        },
                        'url': activeTicket.find('input[name^=direct_link]').val(),
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

            var lastComment = activeTicket.find('.customer_history_ticket_container:not(.customer_history_ticket_outside_note):last');
            var isAgent = lastComment.find('.a-user-icon').hasClass('agent_thumb_50');
            if (isAgent) { //last comment by the agent
                return;
            }

            var subject = activeTicket.find('.a-ticket-subject').text().trim();
            var body = lastComment.find('.a-ticket-meat').text();

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
                    'url': activeTicket.find('input[name^=direct_link]').val(),
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
                activeTicket.find('.a-ticket-reply form:first').after(macroContainer);
            });
        };
        var caseInterval = setInterval(caseCheck, 200);
    };

    var getData = function () {

    };

    var setTitle = function () {

    };


    return {
        init: init,
        getData: getData,
        setTitle: setTitle
    };

})());
