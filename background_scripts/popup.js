function onLoad() {
    var body = document.querySelector("body");
    if (!body.classList.contains("ispopup")){
        body.classList.add("ispopup");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    onLoad();
});

