gqApp.controller('PopupCtrl', function($scope, $rootScope, $timeout, QuicktextService) {
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

    $scope.insertQuicktext = function(index){
        var id = $scope.quicktexts[index].id;
        chrome.tabs.getSelected(null, function(tab) {
            chrome.tabs.sendMessage(tab.id, {"action": "insert", "id": id}, function(response) {});
        }); 
    };

    $timeout(function(){
        $('body').css({'width': "630px"});
    }, 300);

    $rootScope.$on('$includeContentLoaded', function(event) {
        $("#search-input").focus();
        //$('body').css({'width': "630px"});
    });

    $scope.scroll = function(){
        var scrollContainer = $("#quicktext-table-container");
        var active = $('.active');
        scrollContainer.scrollTop(
            active.offset().top - scrollContainer.offset().top + scrollContainer.scrollTop()
        );  
    };

    // key navigation
    $scope.keys = [];
    $scope.keys.push({ code: 13, action: function() { 
        $scope.insertQuicktext( $scope.focusIndex ); 
    }});
    $scope.keys.push({ code: 38, action: function() { 
        if ($scope.focusIndex > 0){
            $scope.focusIndex--; 
            $scope.scroll();
        }
    }});
    $scope.keys.push({ code: 40, action: function() { 
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
        o.action();
        $scope.$apply();
      });
    });

});

// used for key navigation inside the popup
gqApp.directive('keyTrap', function() {
  return function( scope, elem ) {
    elem.bind('keydown', function( event ) {
      scope.$broadcast('keydown', event.keyCode );
    });
  };
});
 
/*
document.addEventListener('DOMContentLoaded', function () {
    $("body").addClass('ispopup');
    $("#quicktexts-table").addClass("table-hover");

    $(document).keydown(function(e){
        var current = $('#quicktexts-table tbody tr.active:not(.hide)');
        if (current.length === 0){
            // find the first non-hidden element and make it active
            $('#quicktexts-table tbody tr:not(.hide):first').addClass('active');
            return;
        }

        var next = null;
        if (e.keyCode === 13) { // enter
            var key = current.attr("id").split("qt-")[1];
            insertQuicktext(key);
            return;
        } else if (e.keyCode == 38) { // up arrow
            next = $(current.prevAll("tr:not(.hide)")[0]);
        } else if (e.keyCode == 40) { // down arrow
            next = $(current.nextAll("tr:not(.hide)")[0]);
        } else {
            return;
        }

        if (next && next.length && !next.hasClass("hide")){
            current.removeClass('active');
            next.addClass('active');

            // scroll to the active item
            var scrollContainer = $("#quicktexts-table-container");
            scrollContainer.scrollTop(
                next.offset().top - scrollContainer.offset().top + scrollContainer.scrollTop()
            );
        }
    });
});

// Insert quicktext into compose area
function insertQuicktext(id){

}
*/
