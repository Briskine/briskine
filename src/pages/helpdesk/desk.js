(function ($) {
    "use strict";

    if (!$) {
        return;
    }

    $(function () {
        window.gorgiasApplyMacroSuggestion = function (macroId) {
            var activeTicket = $('.active_ticket_type:not(.ui-tabs-hide)');
            var button = activeTicket.find('.ui-macrobox-select button');

            button.click();
            button.click();

            $('a[itemid=' + macroId + ']').click();

            // notify the content-script that a suggestion was used
            window.postMessage({
                'request': 'suggestion-used',
                'template_id': macroId
            }, '*');
        };
    });
}(window.jQuery));


