gqApp.controller('InstallCtrl', function ($scope, $rootScope, $routeParams, InstallService, QuicktextService) {

    var ctrl = this;

    ctrl.step = '';
    ctrl.stepNumber = 0;

    ctrl.steps = [
        'demo',
        'language',
        'types',
        'try'
    ];

    ctrl.demoPlayed = false;
    ctrl.languages = InstallService.languages;
    ctrl.templates = InstallService.templates;

    ctrl.enabledLanguages = function () {
        var res = [];
        for (var i in ctrl.languages) {
            if (ctrl.languages[i].enabled) {
                res.push(ctrl.languages[i].iso);
            }
        }
        return res;
    };

    ctrl.enabledLanguagesLabels = function (){
        var res = [];
        for (var i in ctrl.languages) {
            if (ctrl.languages[i].enabled) {
                res.push(ctrl.languages[i].label);
            }
        }
        if (res.length > 1) {
            return res.slice(0, res.length - 1).join(", ") + " and " + res.slice(res.length-1, res.length);
        }
        return res[0];
    };

    ctrl.toggleLanguage = function (lang) {
        mixpanel.track("Wizard Language", {
            iso: lang.iso,
            enabled: lang.enabled
        });
    };

    // when a category is toggled, enable or disable all the templates inside it
    ctrl.toggleCategory = function (category){
        for (var i in category.templates){
            for (var j in category.templates[i]){
                category.templates[i][j].enabled = category.enabled;
                mixpanel.track("Wizard Template", {
                    title: category.templates[i][j].title,
                    enabled: category.enabled
                });
            }
        }
    };

    ctrl.toggleTemplate = function (template) {
        mixpanel.track("Wizard Template", {
            title: template[0].title,
            enabled: template[0].enabled
        });

        var langs = ctrl.enabledLanguages();
        for (var j in template) {
            var t = template[j];
            if (langs.indexOf(t.iso) !== -1) {
                t.enabled = template[0].enabled;
            }
        }
    };


    var installTemplates = function() {
        var langs = ctrl.enabledLanguages();

        for (var i in ctrl.templates) {
            var category = ctrl.templates[i];
            for (var j in category.templates) {
                var template = category.templates[j];
                for (var k in template) {
                    var t = template[k];
                    if (t.enabled && langs.indexOf(t.iso) !== -1){
                        // set the remote_id to empty string so we don't have any 'undefined' strings in the db
                        t.remote_id = "";
                        QuicktextService.create(t).then();
                    }
                }
            }
        }
    };



    var checkStep = function () {

        ctrl.step = $routeParams.step || 'demo';

        ctrl.stepNumber = ctrl.steps.indexOf(ctrl.step);

        // Send some info about the creation of templates
        mixpanel.track("Wizard Step", {
            step: ctrl.step
        });

        if (ctrl.step === 'demo' && !ctrl.demoPlayed) {
            gorgiasDemo.init();
            ctrl.demoPlayed = true;
        } else if (ctrl.step === 'try') {
            installTemplates();
        } else {
            gorgiasDemo.stopAnimation();
        }

    };


    $scope.$on('$routeUpdate', checkStep);

    checkStep();

});
