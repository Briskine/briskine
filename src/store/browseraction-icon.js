/**
 * Set the browserAction icon
 */

if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    chrome.browserAction.setIcon({
        path: {
            '16': '/icons/icon-16-dark.png',
            '32': '/icons/icon-32-dark.png'
        }
    });
}
