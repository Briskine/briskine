gApp.controller('SidebarCtrl', function ($scope, $location, $http, $window,
                                         AccountService, SettingsService, TemplateService, FilterTagService) {
    $scope.profile = {};
    $scope.filterTags = [];
    $scope.baseURL = Settings.defaults.baseURL;

    $window.addEventListener('message', function (e) {
        if (e.data == "gorgias-signedup-reload") {
            location.reload(true);
        }
    });

    // setup account
    function loadAccount() {
        SettingsService.get("isLoggedIn").then(function (isLoggedIn) {
            if (!isLoggedIn) {
                return;
            }

            AccountService.get().then(function (account) {
                $scope.account = account;
            });
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
            tags.sort(function (a, b) {
                var aName = a.name.toLowerCase();
                var bName = b.name.toLowerCase();
                if (aName < bName)
                    return -1;
                if (aName > bName)
                    return 1;
                return 0;
            });
            $scope.tags = tags;
        });
    }

    loadTags();

    $scope.toggleFilterTag = FilterTagService.toggleFilterTag;
    $scope.emptyFilterTags = FilterTagService.emptyFilterTags;

    // logout function
    $scope.logOut = function () {
        $http({
            method: 'GET',
            url: Settings.defaults.baseURL + 'logout'
        }).then(function () {
            SettingsService.set('isLoggedIn', false).then(location.reload(true));
        });
    };

    $scope.trackSettings = function(isLoggedIn) {
        amplitude.logEvent("Opened Settings", {
            'isLoggedIn': isLoggedIn
        });
    };

    // event listeners
    $scope.$on('toggledFilterTag', function () {
        $scope.filterTags[0] = FilterTagService.filterTags[0];

        if ($scope.filterTags[0] != undefined) {
            $location.path('/list/tag');
        }
    });

    $scope.$on('reload', function () {
        loadTags();
        loadAccount();
    });
    $scope.$on('loggedIn', loadAccount);
});
