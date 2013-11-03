module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
        bg: {
            src: ['libs/js/*.js', 'background_scripts/js/libs/*.js', 'background_scripts/js/*.js',],
            dest: 'background_scripts/js/_dist/gq-bg.js'
        },
        //content: {
        //    src: ['libs/js/*js', 'content_scripts/js/*.js',],
        //    dest: 'content_scripts/js/_dist/gq-content.js'
        //}
    },
    jshint: {
        beforeconcat: [
            //'content_scripts/js/*.js', 
            'background_scripts/js/*.js'
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
                'paths': ['background_scripts/css/', 'content_scripts/css/'],
            },
            files: {
                'background_scripts/css/_dist/gq-bg.css': 'background_scripts/css/bg.styl',
                'content_scripts/css/_dist/gq-content.css': 'content_scripts/css/content.styl',
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
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-stylus');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  grunt.registerTask('default', ['concat', 'jshint', 'stylus']);
  grunt.registerTask('js', ['concat', 'jshint']);
  grunt.registerTask('css', ['stylus']);

};
