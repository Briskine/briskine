function onLoad() {
    var body = document.querySelector("body");
    if (!body.classList.contains("ispopup")){
        body.classList.add("ispopup");
    }
    var table = document.getElementById("quicktexts-table");
    if (!table.classList.contains("table-hover")){
        table.classList.add("table-hover");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    onLoad();
});

