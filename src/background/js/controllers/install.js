gqApp.controller('InstallCtrl', function ($scope, $rootScope, $routeParams, InstallService) {

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

    // when a category is toggled, enable or disable all the templates inside it
    ctrl.toggleCategory = function (category){
        for (var i in category.templates){
            for (var j in category.templates[i]){
                category.templates[i][j].enabled = category.enabled;

            }
        }
    };

    var checkStep = function () {

        ctrl.step = $routeParams.step || 'demo';

        ctrl.stepNumber = ctrl.steps.indexOf(ctrl.step);

        if (ctrl.step === 'demo' && !ctrl.demoPlayed) {
            gorgiasDemo.init();
            ctrl.demoPlayed = true;
        } else {
            gorgiasDemo.stopAnimation();
        }

    };

    $scope.$on('$routeUpdate', checkStep);

    checkStep();

});
