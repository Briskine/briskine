(function ($) {
    "use strict";

    if (!$) {
        return;
    }

    $(function () {
        window.gorgiasApplyMacroSuggestion = function (macroId) {
            $('.ui-macrobox-select button').click();
            $('.ui-macrobox-select button').click();

            $('a[itemid=' + macroId + ']').click();

            // notify the content-script that a suggestion was used
            window.postMessage({
                'request': 'suggestion-used',
                'template_id': macroId
            }, '*');
        };
    });
}(window.jQuery));


