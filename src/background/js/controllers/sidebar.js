gApp.controller('SidebarCtrl', function ($scope, $location, $http, $window,
                                         AccountService, SettingsService, ProfileService, TemplateService, FilterTagService) {
    $scope.profile = {};
    $scope.filterTags = [];
    $scope.baseURL = Settings.defaults.baseURL;

    $window.addEventListener('message', function(e){
        console.log(e.data);
        if (e.data == "signedup-goreload"){
            location.reload(true);
        }
    });

    // setup account

    function loadAccount() {
        AccountService.get().then(function(account) {
            $scope.account = account;
        });
    }

    loadAccount();

    // gather tags
    function loadTags() {
        TemplateService.allTags().then(function (r) {
            var tags = [];

            for (var t in r) {
                tags.push({name: t, count: r[t]});
            }

            $scope.tags = tags;
        });
    }

    loadTags();

    $scope.toggleFilterTag = FilterTagService.toggleFilterTag;
    $scope.emptyFilterTags = FilterTagService.emptyFilterTags;


    // setup profile
    ProfileService.savedTime().then(function (savedTime) {
        $scope.profile.savedTime = savedTime;
    });

    ProfileService.words().then(function (words) {
        $scope.profile.savedWords = words;
        $scope.profile.savedWordsNice = ProfileService.reduceNumbers(words);
    });

    // logout function
    $scope.logOut = function () {
        $http({
            method: 'GET',
            url: Settings.defaults.baseURL + 'logout'
        }).then(function () {
            location.reload(true);
        });
    }

    // event listeners
    $scope.$on('toggledFilterTag', function() {
        $scope.filterTags[0] = FilterTagService.filterTags[0];
        $location.path('/list');
    });

    $scope.$on('reload', loadTags);
    $scope.$on('loggedIn', loadAccount);
});
