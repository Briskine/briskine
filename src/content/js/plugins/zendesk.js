App.plugin(
    "zendesk",
    (function() {
        var init = function(params, callback) {
            return callback(
                null,
                window.location.hostname.indexOf(".zendesk.com") !== -1
            );
        };

        var getData = function(params, callback) {
            // get top-most workspace
            var workspace = $(params.element)
                .parents(".workspace")
                .last();

            var agent_name = $("#face_box .name").text();
            var agent_first_name = agent_name.split(" ")[0];
            var agent_last_name = agent_name.split(" ")[1];

            var name = workspace
                .find("span.sender")
                .text()
                .split("<")[0];
            var first_name = name.split(" ")[0];
            var last_name = name.split(" ")[1];

            var vars = {
                from: [
                    {
                        name: agent_name,
                        first_name: App.utils.getCapsonBegin(agent_first_name),
                        last_name: agent_last_name,
                        email: ""
                    }
                ],
                to: [
                    {
                        name: name,
                        first_name: App.utils.getCapsonBegin(first_name),
                        last_name: last_name,
                        email: workspace.find("span.sender .email").text()
                    }
                ],
                cc: [],
                bcc: [],
                subject: workspace.find("input[name=subject]").val()
            };

            if (callback) {
                return callback(null, vars);
            }
        };

        return {
            init: init,
            getData: getData
        };
    })()
);
