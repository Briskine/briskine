(function ($) {
    "use strict";

    if (!$) {
        return;
    }

    $(function () {
        window.addEventListener('message', function (event) {
            if (event.data && event.data.action && event.data.action == 'gorgiasApplyMacroSuggestion') {
                window.gorgiasApplyMacroSuggestion(event.data.macroId);
            }
        });

        window.gorgiasApplyMacroSuggestion = function(macroId){
            var view = null;
            var macro = require('models/macro').create({id: macroId});

            for (var viewId in window.Ember.View.views) {
                var v = window.Ember.View.views[viewId];

                if (v.hasOwnProperty('elementId')){
                    var el = $('#' + v.elementId);
                    // make sure our view is a visible macro selector
                    if (el.hasClass('macro-selector') &&
                        el.parents('.workspace').length &&
                        el.parents('.workspace').css('display') !== 'none') {
                        view = v;
                        break;
                    }
                }
            }

            if (view) {
                view.get("controller").applyMacro(macro);
                Em.run.next(view, function () {
                    this.set("value", this.delegate.defaultValue)
                });

                // notify the content-script that a suggestion was used
                window.postMessage({
                    'request': 'suggestion-used',
                    'template_id': macroId
                }, '*');
            }

        };
        window.setInterval(function(){
            $('[data-toggle=tooltip]').tooltip();
        }, 1000);
    });
}(window.jQuery));
