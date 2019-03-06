(function () {
    var extensionMetaUrl = 'https://gorgias.github.io/templates-website/extension.json';
    var manifest = chrome.runtime.getManifest();

    // https://github.com/substack/semver-compare
    function semverCompare (a, b) {
        var pa = a.split('.');
        var pb = b.split('.');
        for (var i = 0; i < 3; i++) {
            var na = Number(pa[i]);
            var nb = Number(pb[i]);
            if (na > nb) return 1;
            if (nb > na) return -1;
            if (!isNaN(na) && isNaN(nb)) return 1;
            if (isNaN(na) && !isNaN(nb)) return -1;
        }
        return 0;
    }

    function checkVersion () {
        var versionRequest = new XMLHttpRequest();
        versionRequest.addEventListener('load', function () {
            var extension = {
                version: '1.0.0'
            };
            try {
                extension = JSON.parse(this.responseText);
            } catch (err) {}

            if (semverCompare(extension.version, manifest.version) === 1) {
                // force update request
                chrome.runtime.requestUpdateCheck(function () {});
            }
        });
        versionRequest.open('GET', extensionMetaUrl);
        versionRequest.send();
    }

    chrome.runtime.onUpdateAvailable.addListener(function () {
        chrome.runtime.reload();
    });

    if (ENV === 'production') {
        checkVersion();
    }
}());
