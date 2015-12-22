gApp.controller('SidebarCtrl', function ($scope, $location, AccountService, SettingsService, ProfileService, TemplateService, FilterTagService) {
    $scope.profile = {};
    $scope.filterTags = [];

    // setup account
    AccountService.get().then(function(data) {
      $scope.account = data;
    });

    // setup profile

    ProfileService.savedTime().then(function (savedTime) {
        $scope.profile.savedTime = savedTime;
    });

    ProfileService.words().then(function (words) {
        $scope.profile.savedWords = words;
        $scope.profile.savedWordsNice = ProfileService.reduceNumbers(words);
    });

    // gather tags
    TemplateService.allTags().then(function (r) {
        var tags = [];

        for (var t in r) {
            tags.push({name: t, count: r[t]});
        }

        $scope.tags = tags;
    });

    $scope.toggleFilterTag = FilterTagService.toggleFilterTag;
    $scope.emptyFilterTags = FilterTagService.emptyFilterTags;

    $scope.$on('toggledFilterTag', function() {
        $scope.filterTags[0] = FilterTagService.filterTags[0];
        $location.path('/list');
    });
});
