/**
 * Heldesks' code (Zendesk, Desk etc..)
 */

App.helpdesk = {
    init: function () {
        // fetch template content from the extension
        if (window.location.hostname.indexOf('.zendesk.com') !== -1) {
            App.helpdesk.zendesk.init();
        }
        // for desk.com it's more complicated as there are custom domains
        if ($('link[href^=https\\:\\/\\/cdn\\.desk\\.com]').length) {
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
                    chrome.runtime.sendMessage({
                        'request': 'track',
                        'event': 'Suggestion Used'
                    });
                }
            });

            var keys = {
                49: 1,
                50: 2,
                51: 3,
                52: 4
            };

            var sendShortcut = function (e) {
                e.preventDefault();

                window.postMessage({
                    'action': 'gorgiasApplyMacroSuggestion',
                    'macroId': $('.macro-list-item:eq(' + keys[e.keyCode] + ') .macro-suggestion-btn').attr('macro-id')
                }, '*');
            };

            Mousetrap.bindGlobal('alt+1', sendShortcut);
            Mousetrap.bindGlobal('alt+2', sendShortcut);
            Mousetrap.bindGlobal('alt+3', sendShortcut);
            Mousetrap.bindGlobal('alt+4', sendShortcut);

            var searchFocused = false;
            var selectElement = function (dir) {
                var currentlyFocused = $('.macro-list-item.zd-item-focus');
                if (currentlyFocused.length) {
                    var nextEl = dir === 'up' ? currentlyFocused.prevAll(':not(.g-hide):first') : currentlyFocused.nextAll(':not(.g-hide):first');

                    if (nextEl.length) {
                        currentlyFocused.removeClass('zd-item-focus');
                        nextEl.addClass('zd-item-focus');
                        nextEl.get(0).scrollIntoView(false);
                    }
                }
            };

            Mousetrap.bindGlobal('up', function (e) {
                if (searchFocused) {
                    e.preventDefault();
                    selectElement('up');
                }
            });
            Mousetrap.bindGlobal('down', function (e) {
                if (searchFocused) {
                    e.preventDefault();
                    selectElement('down');
                }
            });

            // Copy email address shortcut
            Mousetrap.bindGlobal('ctrl+shift+c', function (e) {
                var emailLink = $('a.email');
                var selection = window.getSelection();

                // create new range and remove all others
                var range = document.createRange();
                range.selectNode(emailLink[0]);
                selection.removeAllRanges();
                selection.addRange(range);

                try {
                    // Now that we've selected the anchor text, execute the copy command
                    document.execCommand('copy');
                } catch (err) {
                    console.error('Oops, unable to copy');
                }

                // Remove the selections
                selection.removeAllRanges();
            });
            Mousetrap.bindGlobal('enter', function (e) {
                if (searchFocused) {
                    e.preventDefault();

                    window.postMessage({
                        'action': 'gorgiasApplyMacroSuggestion',
                        'macroId': $('.macro-list-item.zd-item-focus .macro-suggestion-btn').attr('macro-id')
                    }, '*');
                }
            });


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

                var emailCheck = function () {
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
                var emailInterval = setInterval(emailCheck, 200);

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

                        chrome.runtime.sendMessage({
                            'request': 'track',
                            'event': 'Showed suggestions'
                        });

                        $('.macro-suggestions-container').remove();
                        var macroContainer = $("<div class='macro-suggestions-container'>");
                        var searchBar = $("<div class='macro-search-bar'></div>");
                        var searchInput = $("<input type='text' class='macro-search-input' placeholder='Search macros' />");

                        searchInput.on('focus', function () {
                            searchFocused = true;
                            // also if no element in the macro list is focused, focus the first one
                            if ($('.macro-list-item.zd-item-focus').length === 0) {
                                $('.macro-list-item:first').addClass('zd-item-focus');
                            }
                        });
                        searchInput.on('blur', function () {
                            searchFocused = false;
                        });


                        searchInput.on('keyup', function (e) {
                            if (e.keyCode === 40 || e.keyCode === 38) {
                                return;
                            }

                            var macros = $('.macro-suggestion-btn');
                            var searchQuery = $(this).val().toLowerCase();

                            // revert all highlights if any
                            $('.macro-title').each(function () {
                                $(this).html($(this).text());
                            });

                            macros.each(function () {
                                var title = $(this).find('.macro-title');
                                var titleText = title.text();

                                if (searchQuery !== '') {
                                    $('.macro-list-item').removeClass('zd-item-focus');
                                    $('.macro-list-item:not(.g-hide):first').addClass('zd-item-focus');

                                    var startPos = titleText.toLowerCase().search(searchQuery);

                                    if (startPos !== -1) {
                                        var highlight = '<strong>' + titleText.substring(startPos, startPos + searchQuery.length) + '</strong>';
                                        var newText = titleText.substring(0, startPos) + highlight + titleText.substring(startPos + searchQuery.length, titleText.length);

                                        title.html(newText);
                                        $(this).parent().removeClass('g-hide');
                                    } else {
                                        $(this).parent().addClass('g-hide');
                                    }
                                } else {
                                    // show all macros
                                    $('.macro-list-item').removeClass('g-hide');
                                    return false;
                                }
                            });


                            var emptyMsg = $('.macro-empty-message');
                            // show or hide the empty macro message accordingly
                            if (macros.length === $('.macro-list-item.g-hide').length) {
                                emptyMsg.removeClass('g-hide');
                            } else {
                                emptyMsg.addClass('g-hide');
                            }
                        });
                        searchBar.append(searchInput);
                        macroContainer.append(searchBar);

                        var macroList = $("<ul class='zd-menu-list-holder macro-list'>");
                        macroList.append($('<li class="macro-empty-message g-hide">No macros found</li>'));

                        $.each(macros, function (i, macro) {
                            var macroLi = $("<li class='zd-menu-item macro-list-item'>");
                            var macroBtn = $("<a class='macro-suggestion-btn'>");
                            var macroTitle = $("<span class='macro-title'>");

                            macroBtn.attr('onclick', "gorgiasApplyMacroSuggestion(" + macro["external_id"] + ")");
                            macroBtn.attr('macro-id', macro['external_id']);

                            var title = macro.body.replace(/\n/g, "<br />");
                            macroBtn.attr('title', title);
                            macroBtn.attr('data-toggle', "tooltip");
                            macroBtn.attr('data-html', "true");
                            macroBtn.attr('data-placement', "right");
                            macroBtn.on('mouseenter', function () {
                                // remove others
                                $('.macro-list-item').removeClass('zd-item-focus');
                                $(this).parent().addClass('zd-item-focus');
                            });

                            macroTitle.html(macro.title);

                            macroBtn.append(macroTitle);

                            if (i < 4) {
                                var macroShortcut = $("<span class='macro-shortcut'>alt+" + (i + 1) + "</span>");
                                macroBtn.append(macroShortcut);
                            }
                            //macroBtn.append(scoreEl);
                            macroLi.append(macroBtn);
                            macroList.append(macroLi);
                        });
                        macroContainer.append(macroList);

                        $('.comment_input .content .options').before(macroContainer);

                        // select the first macro by default
                        $('.macro-list-item').eq(0).addClass('zd-item-focus');
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
        }
    }
}
;
