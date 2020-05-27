import {init as gorgiasDemoInit} from '../utils/demo';

export default function InstallCtrl ($scope, $rootScope, $routeParams, InstallService, TemplateService) {
    'ngInject';

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

    TemplateService.quicktexts().then(function (templates) {
        // add default templates only if we don't have others
        if (templates.length) {
            return;
        }
        for (var i in InstallService.preloadedTemplates) {
            var t = InstallService.preloadedTemplates[i];
            t.nosync = 1;
            TemplateService.create(t, true);
        }
    });


    ctrl.enabledLanguages = function () {
        var res = [];
        for (var i in ctrl.languages) {
            if (ctrl.languages[i].enabled) {
                res.push(ctrl.languages[i].iso);
            }
        }
        return res;
    };

    ctrl.enabledLanguagesLabels = function () {
        var res = [];
        for (var i in ctrl.languages) {
            if (ctrl.languages[i].enabled) {
                res.push(ctrl.languages[i].label);
            }
        }
        if (res.length > 1) {
            return res.slice(0, res.length - 1).join(", ") + " and " + res.slice(res.length - 1, res.length);
        }
        return res[0];
    };

    // when a category is toggled, enable or disable all the templates inside it
    ctrl.toggleCategory = function (category) {
        for (var i in category.templates) {
            for (var j in category.templates[i]) {
                category.templates[i][j].enabled = category.enabled;
            }
        }
    };

    ctrl.toggleTemplate = function (template) {
        var langs = ctrl.enabledLanguages();
        for (var j in template) {
            var t = template[j];
            if (langs.indexOf(t.iso) !== -1) {
                t.enabled = template[0].enabled;
            }
        }
    };


    var installTemplates = function () {
        var langs = ctrl.enabledLanguages();

        for (var i in ctrl.templates) {
            var category = ctrl.templates[i];
            for (var j in category.templates) {
                var template = category.templates[j];
                for (var k in template) {
                    var t = template[k];
                    if (t.enabled && langs.indexOf(t.iso) !== -1) {
                        // set the remote_id to empty string so we don't have any 'undefined' strings in the db
                        t.remote_id = "";
                        TemplateService.create(t).then();
                    }
                }
            }
        }
    };


    var checkStep = function () {

        ctrl.step = $routeParams.step || 'demo';

        ctrl.stepNumber = ctrl.steps.indexOf(ctrl.step);

        if (ctrl.step === 'demo' && !ctrl.demoPlayed) {
            gorgiasDemoInit();
            ctrl.demoPlayed = true;
        } else if (ctrl.step === 'try') {
            installTemplates();
        }
    };


    $scope.$on('$routeUpdate', checkStep);

    checkStep();

}
