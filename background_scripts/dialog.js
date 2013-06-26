function onLoad() {
    var args = window.dialogArguments;
    var form = document.querySelector("#quicktext-form");
    //var view = document.querySelector("#quicktext-view");
    if (args && args.show == 'form') {
        form.classList.add('show');
        //view.classList.add('hide');
        var title = document.querySelector("#qt-title");
        var body = document.querySelector("#qt-body");
        // setting the value to the text selected
        if (args.selection){
            body.value = args.selection;
        }
        title.focus();
    } else if (args.show == 'view') {
        form.classList.add('hide');
        //view.classList.add('show');
    }
}

document.addEventListener("DOMContentLoaded", function() {
    onLoad();
});
