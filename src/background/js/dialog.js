gqApp.controller('DialogCtrl', function($scope, $rootScope, QuicktextService) {
    $scope.controller = "DialogCtrl";
    $scope.selectedQt = {
        'id': '',
        'key': '',
        'subject': '',
        'shortcut': '',
        'title': '',
        'tags': '',
        'body': ''
    };

    $rootScope.$on('$includeContentLoaded', function(event) {
        // Show the form for adding a new quicktext or creating one
        $('.close').hide(); // hide close icon
        $('.modal').modal();
        $('.modal').on('shown.bs.modal', function () { //put focus on the first text input
            $(this).find('input[type=text]:first').focus();
        });
        var args = window.dialogArguments;
        if (args.selection){
            $scope.selectedQt.body = args.selection;
        }
    });

    $scope.saveQt = function() {
        if (!$scope.selectedQt.title){
            alert("Please enter a Title");
            return false;
        }

        if (!$scope.selectedQt.body){
            alert("Please enter a Quicktext Template");
            return false;
        }
        QuicktextService.create($scope.selectedQt);
        window.close();
    };
});
