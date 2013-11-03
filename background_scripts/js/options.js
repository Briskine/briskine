gqApp.controller('OptionsCtrl', function($scope, QuicktextService, SettingsService, ProfileService) {
    var defaults = {
        'id': '',
        'key': '',
        'title': '',
        'subject': '',
        'shortcut': '',
        'tags': '',
        'body': '',
    };

    // update this every time there is a change to the list of quicktexts
    // having a function instead throws an infinite loop in angular for some
    // reason
    //
    // XXX: search for a solution
    $scope.quicktexts = QuicktextService.quicktexts();
    $scope.tags = QuicktextService.allTags();
    $scope.filterTags = [];
    $scope.sidebarHidden = SettingsService.get('sidebarHidden');

    $scope.profile = ProfileService;
    $scope.settings = SettingsService;

    $scope.tabcompleteEnabled = SettingsService.get('tabcompleteEnabled');
    $scope.autocompleteEnabled = SettingsService.get('autocompleteEnabled');

    $scope.$on('$routeChangeSuccess', function () {
        $("[data-toggle=tooltip]").tooltip();
        $("[data-toggle=popover").popover();
    }); 

    // Show the form for adding a new quicktext or creating one
    $scope.showForm = function(id){
        if (!id){ // new qt
            $scope.selectedQt = angular.copy(defaults);
        } else { // update qt
            $scope.selectedQt = QuicktextService.get(id);
        }

        $('.modal').modal();
        $('.modal').on('shown.bs.modal', function () { //put focus on the first text input
            $(this).find('input[type=text]:first').focus();
        });
    };

    // Delete a quicktext. This operation should first delete from the localStorage
    // then it should imedially go to the service and delete on the server
    $scope.deleteQt = function(id){
        QuicktextService.delete(id);
        $scope.quicktexts = QuicktextService.quicktexts(); 
    };

    // Delete all quicktexts. This will not delete the quicktexts on the server side
    $scope.deleteAll = function (){
        var r = confirm("Are you sure you want to delete all Quicktexts?\n\nNote: they will NOT be deleted from the sync server.");
        if (r === true){
            QuicktextService.deleteAll();
        }
        $scope.quicktexts = QuicktextService.quicktexts(); 
    };

    // Save a quicktext, perform some checks before
    $scope.saveQt = function() {
        if (!$scope.selectedQt.title){
            alert("Please enter a Title");
            return false;
        }

        if (!$scope.selectedQt.body){
            alert("Please enter a Quicktext Template");
            return false;
        }
        if ($scope.selectedQt.id) {
            QuicktextService.update($scope.selectedQt);
        } else {
            // generate a new id
        
            QuicktextService.create($scope.selectedQt);
        }
        // hide teh modal
        $('.modal').modal('hide');
        $scope.quicktexts = QuicktextService.quicktexts(); 
    };

    $scope.toggleFilterTag = function(tag){
        var index = $scope.filterTags.indexOf(tag); 
        if (index === -1) {
            $scope.filterTags.push(tag);
        } else {
            $scope.filterTags.splice(index, 1); // remove from tags
        }
    };

    $scope.toggleSidebar = function(){
        $scope.sidebarHidden = !$scope.sidebarHidden; 
        // put in settings
        SettingsService.set('sidebarHidden', $scope.sidebarHidden);
    };
});
