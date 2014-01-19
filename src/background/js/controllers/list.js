gqApp.controller('ListCtrl', function($scope, $rootScope, $routeParams, $location,  QuicktextService, SettingsService, ProfileService) {
    var $formModal;

    $scope.controller = 'ListCtrl';
    $scope.quicktexts = [];
    $scope.tags = [];
    $scope.filterTags = [];

    QuicktextService.quicktexts().then(function(response){
        $scope.quicktexts = response;
    });

    QuicktextService.allTags().then(function(response){
        $scope.tags = response;
    });

    /* Init modal and other dom manipulation
     * when the templates have loaded
     */
    var initDom = function() {
      $("#search-input").focus();

      /* New/Edit modal
        */
      $formModal = $('#quicktext-modal');
      $formModal.modal({
        show: false
      });

      $formModal.on('hide.bs.modal', function (e) {
        $location.path('/list').search({});
        $scope.$apply();
      });

      $formModal.on('shown.bs.modal', function () {
        //put focus on the first text input
        $formModal.find('input[type=text]:first').focus();
      });

      $scope.showLogin = function(){
          $("#login-modal").modal();
      };

      checkRoute();
    };

    $rootScope.$on('$includeContentLoaded', initDom);

    // Show the form for adding a new quicktext or creating one
    $scope.showForm = function(id) {
        _gaq.push(['_trackEvent', 'forms', 'show']);

        var defaults = {
            'id': '',
            'key': '',
            'subject': '',
            'shortcut': '',
            'title': '',
            'tags': '',
            'body': ''
        };

        if ($routeParams.id === 'new') {
          // new qt
          $scope.selectedQt = angular.copy(defaults);
          $scope.selectedQt.body = $routeParams.body;
        } else if ($routeParams.id) { // update qt
            QuicktextService.get($routeParams.id).then(function(r){
                $scope.selectedQt = angular.copy(r);
            });
        }

        $formModal.modal('show');
    };

    /* Check search params to see if adding or editing items
     */
    var checkRoute = function() {

      // if not the default list
      // new or edit, so show the modal
      if($routeParams.id) {
        $scope.showForm();
      }

    };

    $scope.$on('$routeUpdate', checkRoute);

    // Delete a quicktext. This operation should first delete from the localStorage
    // then it should imedially go to the service and delete on the server
    $scope.deleteQt = function(){
        QuicktextService.delete(this.quicktext.id);
        QuicktextService.quicktexts().then(function(r){$scope.quicktexts = r;});
        QuicktextService.allTags().then(function(r){$scope.tags = r;});
    };

    // Delete all quicktexts. This will not delete the quicktexts on the server side
    $scope.deleteAll = function (){
        var r = confirm("Are you sure you want to delete all Quicktexts?\n\nNote: they will NOT be deleted from the sync server.");
        if (r === true){
            QuicktextService.deleteAll();
        }
        QuicktextService.quicktexts().then(function(r){$scope.quicktexts = r;});
        QuicktextService.allTags().then(function(r){$scope.tags = r;});
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
            QuicktextService.create($scope.selectedQt);
        }
        // hide teh modal
        $('.modal').modal('hide');
        QuicktextService.quicktexts().then(function(r){$scope.quicktexts = r;});
        QuicktextService.allTags().then(function(r){$scope.tags = r;});
    };

    // Save a quicktext, perform some checks before
    $scope.duplicateQt = function() {
        if (!$scope.selectedQt.title){
            alert("Please enter a Title");
            return false;
        }

        if (!$scope.selectedQt.body){
            alert("Please enter a Quicktext Template");
            return false;
        }

        QuicktextService.create($scope.selectedQt);

        // hide teh modal
        $('.modal').modal('hide');
        QuicktextService.quicktexts().then(function(r){$scope.quicktexts = r;});
        QuicktextService.allTags().then(function(r){$scope.tags = r;});
    };

    $scope.toggleFilterTag = function(){
        var index = $scope.filterTags.indexOf(this.tag);
        if (index === -1) {
            $scope.filterTags.push(this.tag);
        } else {
            $scope.filterTags.splice(index, 1); // remove from tags
        }
    };

});
