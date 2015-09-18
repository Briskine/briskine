/**
 * quick-action button
 */

App.qaBtn = function() {
    // the gorgias instance
    var g = this;

    var qaPositionInterval;
    var $qaBtn;
    var $qaTooltip;

    var showQaForElement = function (elem) {

        var show = false;

        // if the element is not a textarea
        // input[type=text] or contenteditable
        if ($(elem).is('textarea, input[type=text], [contenteditable]')) {
            show = true;
        }

        // if the quick access button is focused/clicked
        if (elem.className.indexOf('gorgias-qa-btn') !== -1) {
            show = false;
        }

        // if the dialog search field is focused
        if (elem.className.indexOf('qt-dropdown-search') !== -1) {
            show = false;
        }

        // check if the element is big enough
        // to only show the qa button for large textfields
        if (show === true) {

            var metrics = elem.getBoundingClientRect();

            // only show for elements
            if (metrics.width < 100 || metrics.height < 80) {
                show = false;
            }

        }

        return show;

    };

    var focusin = function(e) {

        // show the qabtn only on gmail and outlook
        if (g.activePlugin !== g.plugins['gmail'] && g.activePlugin !== g.plugins['outlook']) {
            return;
        }

        var textfield = e.target;

        // only show it for valid elements
        if (!showQaForElement(textfield)) {
            return false;
        }

        var rect = e.target.getBoundingClientRect();

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

    };

    var focusout = function() {
        window.top.postMessage({
            action: 'g-qabtn-hide'
        }, '*');
    };

    var setPosition = function (textfield) {
        // TODO just for hacking, rewrite
        var padding = 10;
        var qaBtn = $qaBtn.get(0);
        document.body.classList.add('gorgias-show-qa-btn');

        if(!qaBtn) {
            return;
        }
        // end hack

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
        }

        setPosition(textfield);

        // re-calculate the qa-btn position at an interval,
        // in case it's position or size changes
        qaPositionInterval = setInterval(function() {
            setPosition(textfield);
        }, 1000);

    };

    var hide = function(res) {

        document.body.classList.remove('gorgias-show-qa-btn');

        // stop the position recalculation interval, on focusout
        if(qaPositionInterval) {
            clearInterval(qaPositionInterval);
        }

    };

    var dispatcher = function (res) {

        if(!res.data) {
            return;
        }

        if(res.data.action === 'g-qabtn-show') {
            show(res);
        }

        if(res.data.action === 'g-qabtn-hide') {
            hide(res);
        }

    };

    var create = function() {

        // TODO needs some refactoring
        var container = $('body');

        // add the dialog quick access icon
        $qaBtn = $(g.autocomplete.dialog.qaBtnTemplate);
        $qaTooltip = $(g.autocomplete.dialog.qaBtnTooltip);

        container.append($qaBtn);
        container.append($qaTooltip);

    };

    var init = function() {

        // only attach the event to the top window
        if(!g.data.iframe) {

            // wait for the template to load
            // TODO to this differently
            setTimeout(function() {
                create();
            }, 1000);

            window.addEventListener('message', dispatcher);
        }

        // warning:
        // we have to use focusin because focus does not bubble,
        // but only chrome supports focusin.
        document.body.addEventListener('focusin', focusin);
        document.body.addEventListener('focusout', focusout);

    };

    init();

    return {
        init: init
    };
};
