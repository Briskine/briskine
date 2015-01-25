gqApp.controller('InstallCtrl', function ($scope, $rootScope, $routeParams, InstallService) {

    var ctrl = this;

    ctrl.step = '';
    ctrl.stepNumber = 0;

    ctrl.steps = [
        'demo',
        'language',
        'types',
        'try',
        'custom'
    ];

    ctrl.demoPlayed = false;

    ctrl.languages = [
        {
            label: 'English',
            enabled: true
        },
        {
            label: 'French',
            enabled: false
        },
        {
            label: 'Romanian',
            enabled: false
        }
    ];

    ctrl.templateTypes = [
        {
            label: 'Greetings',
            description: 'Basic greetings used in most emails.',
            enabled: true
        },
        {
            label: 'Sales',
            description: 'Standard sales templates.',
            enabled: false
        }
    ];

    var checkStep = function() {

        ctrl.step = $routeParams.step || 'demo';

        ctrl.stepNumber = ctrl.steps.indexOf(ctrl.step);

        if(ctrl.step === 'demo' && !ctrl.demoPlayed) {
            gorgiasDemo.init();
            ctrl.demoPlayed = true;
        }

    };

    $scope.$on('$routeUpdate', checkStep);

    checkStep();

});
