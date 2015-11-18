gApp.controller('SidebarCtrl', function ($scope, AccountService, SettingsService, ProfileService, TemplateService) {
    $scope.profile = {};

    // setup account
    AccountService.get().then(function(data) {
      $scope.account = data;
    });

    // setup profile
    ProfileService.savedTime().then(function(savedTime) {
      $scope.profile.savedTime = savedTime;
    });

    ProfileService.words().then(function(words) {
      $scope.profile.savedWords = ProfileService.reduceNumbers(words);
    });

    // gather tags
    TemplateService.allTags().then(function (r) {
        $scope.tags = r;
    });
});
