/*
 scrollTo plugin: http://lions-mark.com/jquery/scrollTo/
*/

$.fn.scrollTo = function( target, options, callback ){
  if(typeof options == 'function' && arguments.length == 2){ callback = options; options = target; }
  var settings = $.extend({
    scrollTarget  : target,
    offsetTop     : 50,
    duration      : 500,
    easing        : 'swing'
  }, options);
  return this.each(function(){
    var scrollPane = $(this);
    var scrollTarget = (typeof settings.scrollTarget == "number") ? settings.scrollTarget : $(settings.scrollTarget);
    var scrollY = (typeof scrollTarget == "number") ? scrollTarget : scrollTarget.offset().top + scrollPane.scrollTop() - parseInt(settings.offsetTop);
    scrollPane.animate({scrollTop : scrollY }, parseInt(settings.duration), settings.easing, function(){
      if (typeof callback == 'function') { callback.call(this); }
    });
  });
}

$(document).ready(function(){
    $("body").addClass('ispopup');
    $("#quicktexts-table").addClass("table-hover");
    $('#quicktexts-table tr').click(function(e){
        // A quicktext item was clicked. Insert it into the compose area
        var key = $(this).attr("key").split("qt-")[1];
        insertQuicktext(key);
    });

    $("body").keydown(function(e){
        var current = $('#quicktexts-table tbody tr.active');
        if (!current.length){
            $('#quicktexts-table tbody tr:first').addClass('active');
            return;
        }

        if (e.keyCode == 38) { // up arrow
            var next = current.prev("tr");
        }

        if (e.keyCode == 40) { // down arrow
            var next = current.next("tr");
        }

        if (next.length){
            current.removeClass('active');
            next.addClass('active');
        }

        $("#quicktexts-table").scrollTo("tr.active", {offsetTop: '110'});
    });

});

// Insert quicktext into compose area
function insertQuicktext(key){

}
