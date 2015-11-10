/**
 * quick-action button
 */

App.qaBtn = (function() {
    // the gorgias instance
    var g = this;

    var qaPositionInterval;
    var $qaBtn;
    var $qaTooltip;
    var showQaTooltip;
    var tooltip;
    var currentWindow = window;
    var settings;

    var showQaForElement = function (elem) {

        var show = true;

        // if the quick access button is focused/clicked
        if (elem.className.indexOf('gorgias-qa-btn') !== -1) {
            show = false;
        }

        // if the dialog search field is focused
        if (elem.className.indexOf('qt-dropdown-search') !== -1) {
            show = false;
        }

        // in case we're focusing children of a contenteditable
        // get the parent contenteditable
        elem = App.autocomplete.isEditable(elem);

        if(elem) {
            // check if the element is big enough
            // to only show the qa button for large textfields
            var metrics = elem.getBoundingClientRect();

            // only show for elements
            if (metrics.width < 100 || metrics.height < 80) {
                show = false;
            }
        }

        return show && elem;

    };

    var focusin = function(e) {

        // show the qabtn only on gmail and outlook
        // and allow on localhost, for testing
        if (
            (g.activePlugin !== g.plugins['gmail'] && g.activePlugin !== g.plugins['outlook']) && window.location.href.indexOf('http://localhost') === -1
        ) {
            return;
        }

        var textfield = showQaForElement(e.target);

        // only show it for valid elements
        if (!textfield) {
            return false;
        }

        var rect = textfield.getBoundingClientRect();

        // TODO add scroll position to x/y
        window.top.postMessage({
            action: 'g-qabtn-show',
            textfield: {
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height
            }
        }, '*');

        // First time a user uses our extension
        // we show it and then hide it
        if (settings.qaBtn && settings.qaBtn.hasOwnProperty('shownPostInstall')) {
            if (!settings.qaBtn.shownPostInstall) {
                settings.qaBtn.shownPostInstall = true;
                Settings.set('settings', settings, function(){});

                window.top.postMessage({
                    action: 'g-dialog-completion',
                    source: 'button'
                }, '*');
            }
        }
        return;

    };

    var focusout = function(e) {
        window.top.postMessage({
            action: 'g-qabtn-hide'
        }, '*');
    };

    var click = function() {
        currentWindow.postMessage({
            action: 'g-dialog-completion',
            source: 'button'
        }, '*');

        // send the `-completion-qa` event to the top window
        // so the qabtn doesn't hide when the dialog opens
        window.top.postMessage({
            action: 'g-dialog-completion-qa'
        }, '*');
    };

    var setPosition = function (textfield) {
        var qaBtn = $qaBtn.get(0);
        if(!qaBtn) {
            return;
        }

        var padding = 10;
        var top = textfield.top;
        var left = textfield.left;

        top += $(window).scrollTop();
        left += $(window).scrollLeft();

        top += padding;
        left -= padding;

        // move the quick access button to the right
        // of the textfield
        left += textfield.width - qaBtn.offsetWidth;

        // move the btn using transforms
        // for performance
        var transform = 'translate3d(' + left + 'px, ' + top + 'px, 0)';

        qaBtn.style.transform = transform;
        qaBtn.style.msTransform = transform;
        qaBtn.style.mozTransform = transform;
        qaBtn.style.webkitTransform = transform;

        // TODO we need to do this differently, after the postmessage refactor
        // if (textfield.style.zIndex) {
        //     qaBtn.style.zIndex = textfield.style.zIndex + 1;
        // } else {
        //     qaBtn.style.zIndex = 1;
        // }
    };

    var show = function(res) {
        var textfield = res.data.textfield;
        currentWindow = window;

        // if the event came from an iframe,
        // find the iframe dom node where it came from,
        // get its positions and merge them with the textfield position
        if(window !== res.source) {
            var iframes = document.querySelectorAll('iframe');
            var i;
            for(i = 0; i < iframes.length; i++) {
                // found the iframe where the event came from
                if(iframes[i].contentWindow === res.source) {
                    // add the extra x/y to it
                    var rect = iframes[i].getBoundingClientRect();
                    textfield.left += rect.left;
                    textfield.top += rect.top;
                    break;
                }
            }

            // save the currentWindow, for which iframe the btn was shown
            // so we can post to this window, on btn click
            currentWindow = res.source;
        }

        setPosition(textfield);

        // re-calculate the qa-btn position at an interval,
        // in case it's position or size changes
        qaPositionInterval = setInterval(function() {
            setPosition(textfield);
        }, 2000);

        document.body.classList.add('gorgias-show-qa-btn');
    };

    var hide = function(e) {

        document.body.classList.remove('gorgias-show-qa-btn');

        // stop the position recalculation interval, on focusout
        if(qaPositionInterval) {
            clearInterval(qaPositionInterval);
        }

    };

    var showDialog = function() {
        document.body.classList.add('qa-btn-dropdown-show');
    };

    var hideDialog = function() {
        document.body.classList.remove('qa-btn-dropdown-show');
    };

    var showTooltip = function() {

        if (showQaTooltip) {
            clearTimeout(showQaTooltip);
        }

        showQaTooltip = setTimeout(function () {
            var padding = 14;
            var rect = $qaBtn.get(0).getBoundingClientRect();
            var top = rect.top - padding - tooltip.height + 'px';

            $qaTooltip.removeClass('gorgias-qa-tooltip-bottom');

            // check if we don't have enough space at the top
            if (rect.top < tooltip.height + padding) {
                top = rect.top + rect.height + padding + 'px';

                $qaTooltip.addClass('gorgias-qa-tooltip-bottom');
            }

            $qaTooltip.css({
                top: top,
                left: rect.left - tooltip.width + 28 + 'px'
            });

            $qaTooltip.show();
        }, 500);

    };

    var hideTooltip = function () {
        clearTimeout(showQaTooltip);
        $qaTooltip.hide();
    };

    var dispatcher = function (res) {

        if(!res.data) {
            return;
        }

        if(res.data.action === 'g-qabtn-show') {
            show(res);
        }

        if(res.data.action === 'g-qabtn-hide') {
            // don't hide the button if the dialog is visible
            if (App.autocomplete.dialog.isActive) {
                return;
            }

            hide();
            // hide the dialog along with the button
            // in case it's open
            hideDialog();
        }

        if(res.data.action === 'g-dialog-completion-qa') {
            showDialog(res);
        }

        if(res.data.action === 'g-dialog-hide') {
            hideDialog(res);
        }

    };

    var create = function() {
        var $container = $(document.body);

        // add the dialog quick access icon
        $qaBtn = $(g.autocomplete.dialog.qaBtnTemplate);
        $qaTooltip = $(g.autocomplete.dialog.qaBtnTooltip);

        $qaBtn.on('click', click);
        $qaBtn.on('mouseenter', showTooltip);
        $qaBtn.on('mouseleave', hideTooltip);

        $container.append($qaBtn);
        $container.append($qaTooltip);

        tooltip = {
            height: parseInt($qaTooltip.css('height'), 10),
            width: parseInt($qaTooltip.css('width'), 10)
        };
    };

    var init = function() {
        // only create the qa button in the top window
        if(!g.data.iframe) {
            create();
            window.addEventListener('message', dispatcher);
        }

        // warning:
        // we have to use focusin because focus does not bubble,
        // but only chrome supports focusin.
        document.body.addEventListener('focusin', focusin);
        document.body.addEventListener('focusout', focusout);

        App.settings.fetchSettings(function(s) {
            settings = s;
        }, window.document);
    };

    return {
        init: init
    };
}).call(App);
