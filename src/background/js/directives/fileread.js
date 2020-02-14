export default function fileread ($timeout) {
    'ngInject';

    return {
        scope: {
            fileSelected: '&'
        },
        link: function (scope, element) {
            element.bind('change', (e) => {
                var files = Array.from(e.target.files).map((f) => {
                    return {
                        name: f.name,
                        size: f.size,
                        url: URL.createObjectURL(f)
                    };
                });

                $timeout(() => {
                    scope.fileSelected({
                        files: files
                    });
                });

                e.target.value = '';
            });
        }
    };
}
