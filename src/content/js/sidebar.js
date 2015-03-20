/**
 * Gmail sidebar.
 */

App.sidebar = {
    timer: null,
    enabled: false,
    query: null,
    check: function (url) {
        var container = $('table div[role=complementary]');
        if (container.length) {
            var changeSidebar = function (err, response) {
                var parsedUrl = Handlebars.compile(url)(response);
                if (parsedUrl !== App.sidebar.query) {
                    console.log("Setting sidebar to: " + parsedUrl);
                    App.sidebar.query = parsedUrl;

                    var existingSidebar = $('.g-sidebar');
                    var sidebarEl;
                    if (existingSidebar.length) {
                        sidebarEl = existingSidebar;
                        sidebarEl.attr('src', parsedUrl);
                    } else {
                        sidebarEl = $(App.sidebar.sidebarTemplate);
                        sidebarEl.attr('src', parsedUrl);
                        container.find('div.nH:last').remove();
                        container.append(sidebarEl);
                    }
                    sidebarEl = document.querySelector('.g-sidebar');
                    var paddingBottom = 20;
                    var height = document.querySelector('body').scrollHeight - sidebarEl.getBoundingClientRect().top - paddingBottom;
                    $(sidebarEl).css('height', height + "px");
                }
            };
            // Check if we have a card iframe and it's active
            var cardIframe = $('.tq iframe');
            if (cardIframe.length && cardIframe.css('top') === 'auto') {
                var emailEl = cardIframe[0].contentWindow.document.querySelector('.o-ms-fk .vta');
                if (emailEl) {
                    var response = {
                        to: [{
                            email: emailEl.innerText
                        }]
                    };
                    changeSidebar(null, response);
                }
            } else {
                // The iframe is not active, them just look if we have a contenteditable
                var activeEl = $(document.activeElement);
                if (activeEl.hasClass('editable') && activeEl.attr('contenteditable')) {
                    App.activePlugin.getData({
                        element: activeEl[0]
                    }, changeSidebar);
                }
            }
        }
    },
    sidebarTemplate: "<iframe class='g-sidebar'></iframe>"
}
;
