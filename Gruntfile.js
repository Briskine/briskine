module.exports = function(grunt) {

// List dependencies
deps = {
    'bg': {
        'js':[
            'bower_components/jquery/jquery.js',
            'bower_components/bootstrap/dist/js/bootstrap.min.js',
            'bower_components/underscore/underscore.js',
            'bower_components/underscore.string/lib/underscore.string.js',
            'bower_components/moment/moment.js',

            'bower_components/angular/angular.js',
            'bower_components/angular-route/angular-route.js',
            'bower_components/angular-md5/angular-md5.js',
            'bower_components/angular-moment/angular-moment.js',

            'src/background_scripts/js/*.js'
         ],
         'css': [
            'bower_components/bootstrap/dist/css/bootstrap.css',
         ]
    },
    content: {
        js: [
            'bower_components/jquery/jquery.js',
            'bower_components/underscore/underscore.js',
            'bower_components/underscore.string/lib/underscore.string.js',

            'src/content_scripts/js/patterns.js',
            'src/content_scripts/js/index.js',
            'src/content_scripts/js/autocomplete.js',
            'src/content_scripts/js/events.js'
        ],
        css: [
            'src/content_scripts/css/_dist/gq-content.css',
        ]
    }
};

grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    manifest: grunt.file.readJSON('manifest.json'),
    concat: {
        bg: {
            src: deps['bg']['js'],
            dest: 'src/background_scripts/js/_dist/gq-bg.js'
        },
        content: {
           src: deps.content.js,
           dest: 'src/content_scripts/js/_dist/gq-content.js'
        }
    },
    jshint: {
        beforeconcat: [
            //'content_scripts/js/*.js',
            'src/background_scripts/js/*.js'
        ],
        afterconcat: [
            //'content_scripts/js/_dist/*.js',
            //'background_scripts/js/_dist/*.js'
        ],
    },
    stylus: {
        compile: {
            options: {
                'include css': true,
                'paths': ['src/background_scripts/css/', 'src/content_scripts/css/'],
            },
            files: {
                'src/background_scripts/css/_dist/gq-bg.css': 'src/background_scripts/css/bg.styl',
                'src/content_scripts/css/_dist/gq-content.css': 'src/content_scripts/css/content.styl',
            }
        }
    },
    watch: {
        scripts: {
            files: ['**/*.js'],
            tasks: ['concat', 'jshint'],
            options: {
                spawn: false,
            },
        },
        styles: {
            files: ['**/*.styl', '**/*.css'],
            tasks: ['stylus'],
            options: {
                spawn: false,
            },
        },
    },
    compress: {
        main: {
            options: {
                archive: '<%= pkg.name %>-<%= manifest.version %>.zip'
            },
            files: [
                {src: ['manifest.json','src/**']}
            ]
        }
    }
});

grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-contrib-stylus');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-contrib-compress');

// Default task(s).
grunt.registerTask('default', ['concat', 'jshint', 'stylus']);
grunt.registerTask('js', ['concat', 'jshint']);
grunt.registerTask('css', ['stylus']);

};
