gqApp.controller('PopupCtrl', function($scope, $rootScope, $timeout, QuicktextService) {
//     $rootScope.pageAction = true;

    $scope.controller = "PopupCtrl";
    $scope.quicktexts = [];
    $scope.tags = [];
    $scope.filterTags = [];

    $scope.focusIndex = 0;

    QuicktextService.quicktexts().then(function(response){
        $scope.quicktexts = response;
    });

    QuicktextService.allTags().then(function(response){
        $scope.tags = response;
    });

    $scope.insertQuicktext = function(quicktextId) {
        // get the quicktext id
        _gaq.push(['_trackEvent', 'popup', 'insert']);

        // getch the quicktext
        QuicktextService.get(quicktextId).then(function(quicktext){
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    'action': 'insert',
                    'quicktext': quicktext
                }, function(response) {});
                window.close();
            });
        });
    };

    $rootScope.$on('$includeContentLoaded', function(event) {
        $("#search-input").focus();
    });

    $scope.scroll = function(){
        var scrollContainer = $("#quicktext-table-container");
        var active = $('.active');
        scrollContainer.scrollTop(
            active.offset().top - scrollContainer.offset().top + scrollContainer.scrollTop()
        );
    };

    var KEY_ENTER = 13,
        KEY_UP = 38,
        KEY_DOWN = 40;
    // key navigation
    $scope.keys = [];
    $scope.keys.push({ code: KEY_ENTER, action: function() {
        $scope.insertQuicktext($scope.focusIndex);
    }});

    $scope.keys.push({ code: KEY_UP, action: function() {
        if ($scope.focusIndex > 0){
            $scope.focusIndex--;
            $scope.scroll();
        }
    }});
    $scope.keys.push({ code: KEY_DOWN, action: function() {
        if ($scope.focusIndex + 1 < $scope.quicktexts.length) {
            $scope.focusIndex++;
            $scope.scroll();
        }
    }});

    $scope.$on('keydown', function(msg, code) {
      $scope.keys.forEach(function(o) {
        if ( o.code !== code ) {
            return;
        }
        console.log('keydown');
        o.action();
        $scope.$apply();
      });
    });

    // if the search changes the focus should be reset to 0 again
    $scope.searchChange = function(){
        $scope.focusIndex = 0;
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
