export default function fileread () {
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
                scope.fileSelected({
                    files: files
                });

                e.target.value = '';
            });
        }
    };
}
