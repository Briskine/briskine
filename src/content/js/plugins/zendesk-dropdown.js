App.plugin('zendesk', (function () {
    var zendeskMacros = [];

    var init = function (params, callback) {
        if (window.location.hostname.indexOf('.zendesk.com') === -1) {
            // return true as response if plugin should be activated
            return callback(null, false);
        }

        Settings.get('settings', {}, function (settings) {
            if (settings.suggestions && settings.suggestions.enabled === false) {
                return callback(null, false);
            }
            callback(null, true);

            injectScript().then(function (widgetHtml) {
                fetchMacros().then(function (macros) {
                    zendeskMacros = macros;
                    load({
                        widget: widgetHtml,
                        macros: macros
                    });
                }, function (err) {
                    console.error("Fething macros failed", Error(err));
                });
            }, function (err) {
                console.error("Injecting script failed", Error(err));
            });
        });
    };

    // inject the zendesk script into the dom - this is done for interacting with the macro insertion
    var injectScript = function () {
        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.type = "text/javascript";
            script.src = chrome.extension.getURL("pages/helpdesk/zendesk.js");
            if (document.body) {
                document.body.appendChild(script);
                script.onload = function () {
                    document.body.removeChild(script);
                };
            }

            // fetch our widget of the template
            $.get(chrome.extension.getURL('pages/helpdesk/zendesk.html'), function (res) {
                resolve(res);
            });
        });
    };

    // get macros from Zendesk API
    var fetchMacros = function () {
        return new Promise(function (resolve, reject) {
            var macros = [];
            $.getJSON('/api/v2/macros.json?active=true&only_viewable=true&sort_by=usage_7d', function (res) {
                resolve(res.macros);
            });
        });
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

        // bind keyboard shortcuts
        var keysMaps = {
            49: 1,
            50: 2,
            51: 3,
            52: 4
        };

        var sendShortcut = function (e) {
            e.preventDefault();

            window.postMessage({
                'action': 'gorgiasApplyMacro',
                'macroId': $('.macro-list-item:not(.g-hide)').eq(keysMaps[e.keyCode] - 1).find('.macro-suggestion-btn').attr('macro-id')
            }, '*');
        };

        Mousetrap.bindGlobal('alt+1', sendShortcut);
        Mousetrap.bindGlobal('alt+2', sendShortcut);
        Mousetrap.bindGlobal('alt+3', sendShortcut);
        Mousetrap.bindGlobal('alt+4', sendShortcut);

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

        Mousetrap.bind('up', function (e) {
            if ($(document.activeElement).hasClass('macro-search-input')) {
                e.preventDefault();
                selectElement('up');
            }
        });
        Mousetrap.bind('down', function (e) {
            if ($(document.activeElement).hasClass('macro-search-input')) {
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

        Mousetrap.bind('enter', function (e) {
            if ($(document.activeElement).hasClass('macro-search-input')) {
                e.preventDefault();

                window.postMessage({
                    'action': 'gorgiasApplyMacro',
                    'macroId': $('.macro-list-item.zd-item-focus .macro-suggestion-btn').attr('macro-id')
                }, '*');
            }
        });
    };


    var bindSearchEvents = function(){
        // Search input box
        var searchInput = $('.macro-search-input');
        searchInput.on('focus', function () {
            // also if no element in the macro list is focused, focus the first one
            if ($('.macro-list-item.zd-item-focus').length === 0) {
                $('.macro-list-item:first').addClass('zd-item-focus');
            }
        });


        var updateSearchTimeout = null;
        searchInput.on('keyup', function (e) {
            if (e.keyCode === 40 || e.keyCode === 38) {
                return;
            }

            if (updateSearchTimeout) {
                clearInterval(updateSearchTimeout);
            }
            updateSearchTimeout = setTimeout(updateSearch, 50);
        });

        var updateSearch = function() {
            var macros = $('.macro-suggestion-btn');
            var searchQuery = searchInput.val().toLowerCase();

            // revert all highlights if any
            $('.macro-title strong').each(function(){
                var btn = $(this).parent();
                btn.html(btn.text());
            });

            if (searchQuery !== '') {
                // hide all items at first
                var macroItems = $('.macro-list-item')
                macroItems.addClass('g-hide');

                var matchedOne = false;
                for (var i in zendeskMacros) {
                    var macro = zendeskMacros[i];
                    var startPos = macro.title.toLowerCase().search(searchQuery);
                    var macroEl = $('.macro-suggestion-btn[macro-id=' + macro.id +']');

                    if (startPos !== -1) {
                        matchedOne = true;
                        var highlight = '<strong>' + macro.title.substring(startPos, startPos + searchQuery.length) + '</strong>';
                        var newText = macro.title.substring(0, startPos) + highlight + macro.title.substring(startPos + searchQuery.length, macro.title.length);

                        // update title with the new text
                        macroEl.find('.macro-title').html(newText);
                        macroEl.parent().removeClass('g-hide');
                    }
                }

                if (!matchedOne) {
                    macroItems.removeClass('g-hide');
                }

                // put focus on the first item
                macroItems.removeClass('zd-item-focus');
                $('.macro-list-item:not(.g-hide):first').addClass('zd-item-focus');

                // update shortcuts
                setShortcutLabels();
            } else {
                // show all items and update labels
                $('.macro-list-item').removeClass('g-hide');
                setShortcutLabels();
            }

            // if no macros match show the empty message
            var emptyMsg = $('.macro-empty-message');
            if (macros.length === $('.macro-list-item.g-hide').length) {
                emptyMsg.removeClass('g-hide');
            } else {
                emptyMsg.addClass('g-hide');
            }
        };
    };

    var load = function (params) {
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

            loadEmail();
            loadMacroWidget(params);
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

    // set the keyboard shortcut labels everytime the list changes
    var setShortcutLabels = function(){
        // clean first
        $('.macro-shortcut').remove();

        $('.macro-list-item:not(.g-hide)').each(function(macroIndex, macroLi){
            if (macroIndex < 4) {
                $(macroLi).find('.macro-suggestion-btn').append("<span class='macro-shortcut'>alt+" + (macroIndex + 1) + "</span>");
            } else {
                return false; //stop the loop
            }
        });
    };

    // Populate our macro widget
    var loadMacroWidget = function (params) {
        // make sure we have the content loaded before inserting stuff
        var bodyCheck = function () {
            var subject = '';
            var body = '';

            var currentWorkspace = null;
            var isAgent = false;
            $('.workspace').each(function (_, workspace) {
                workspace = $(workspace);

                if (workspace.css('display') !== 'none') {
                    currentWorkspace = workspace;
                    var firstEvent = workspace.find('.event-container .event.is-public:first');

                    isAgent = firstEvent.find('.user_photo').hasClass('agent');
                    subject = workspace.find('input[name=subject]').val();
                    body = firstEvent.find('.zd-comment').text();
                }
            });

            if (!currentWorkspace) {
                return;
            }

            clearInterval(bodyInterval);

            $('.macro-suggestions-container').remove();

            var macroContainer = $(params.widget);
            var macroList = macroContainer.find('.macro-list');

            $.each(params.macros, function (macroIndex, macro) {
                var macroLi = $("<li class='zd-menu-item macro-list-item'>");
                var macroBtn = $("<a class='macro-suggestion-btn'>");
                var macroTitle = $("<span class='macro-title'>");

                macroBtn.attr('onclick', "gorgiasApplyMacro(" + macro.id + ")");
                macroBtn.attr('macro-id', macro.id);
                macroBtn.attr('macro-score', 0);

                macro.body = '';
                for (var i in macro.actions) {
                    var action = macro.actions[i];
                    if (action.field === 'comment_value') {
                        macro.body = action.value[1];
                    }
                }

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


                //macroBtn.append(scoreEl);
                macroLi.append(macroBtn);
                macroList.append(macroLi);
            });
            macroContainer.append(macroList);

            currentWorkspace.find('.comment_input .content .options').before(macroContainer);

            // select the first macro by default
            $('.macro-list-item').eq(0).addClass('zd-item-focus');

            setShortcutLabels();

            // Once the list is populated, bind the events
            bindSearchEvents();

            chrome.runtime.sendMessage({
                'request': 'track',
                'event': 'Showed macros',
                'data': {
                    'macros_count': _.size(params.macros),
                    'helpdesk_host': window.location.hostname
                }
            });


            if (!isAgent && !subject || !subject.length || !body.length) {
                return;
            }

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

                var macroList = $('.macro-list');
                var macroLi = macroList.find('.macro-list-item:not(.g-hide)');

                // from the suggested macros attach scores to our macros
                for (var m in suggestedMacros) {
                    var suggestedMacro = suggestedMacros[m];
                    $('.macro-suggestion-btn[macro-id=' + suggestedMacro.external_id + ']').attr('macro-score', suggestedMacro.score);
                }

                macroLi.sort(function(a, b){
                    var macroScoreA = $(a).find('.macro-suggestion-btn').attr('macro-score');
                    var macroScoreB = $(b).find('.macro-suggestion-btn').attr('macro-score');

                    if (macroScoreA > macroScoreB) {
                        return -1;
                    }
                    if (macroScoreA < macroScoreB) {
                        return 1;
                    }
                    return 0;
                });
                macroLi.detach().appendTo(macroList);
                $('.macro-list-item.zd-item-focus').removeClass('zd-item-focus');
                $('.macro-list-item').eq(0).addClass('zd-item-focus');

                setShortcutLabels();

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

    return {
        init: init,
        getData: getData
    };

})());
