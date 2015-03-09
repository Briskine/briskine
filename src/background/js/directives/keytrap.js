// used for key navigation inside the popup
gApp.directive('keyTrap', function () {
    return function (scope, elem) {
        elem.bind('keydown', function (event) {
            scope.$broadcast('keydown', event.keyCode);
        });
    };
});
