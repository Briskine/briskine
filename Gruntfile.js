'use strict';

module.exports = function(grunt) {
  // load all grunt tasks
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  var dependencies = {
      background: {
        js: [
          'bower_components/jquery/jquery.js',
          'bower_components/bootstrap/dist/js/bootstrap.min.js',
          'bower_components/underscore/underscore.js',
          'bower_components/underscore.string/lib/underscore.string.js',
          'bower_components/moment/moment.js',

          'bower_components/angular/angular.js',
          'bower_components/angular-route/angular-route.js',
          'bower_components/angular-md5/angular-md5.js',
          'bower_components/angular-moment/angular-moment.js',

          // Should be first
          'src/background/js/environment.js',
          'src/background/js/*.js'
         ],
         css: [
          'bower_components/bootstrap/dist/css/bootstrap.css',
         ]
      },
      content: {
        js: [
          'bower_components/jquery/jquery.js',
          'bower_components/underscore/underscore.js',
          'bower_components/underscore.string/lib/underscore.string.js',

          'src/content/js/patterns.js',
          'src/content/js/index.js',
          'src/content/js/autocomplete.js',
          'src/content/js/events.js'
        ],
        css: [
          'src/content/css/content.css',
        ]
      }
    };

  // Project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    manifestContents: grunt.file.readJSON('src/manifest.json'),
    // TODO ad watching all files and reloading extension in browser
    watch: {
      stylus: {
        files: ['src/**/*.styl', 'src/**/*.css'],
        tasks: ['stylus:development'],
        options: {
          spawn: false
        }
      }
    },
    stylus: {
      development: {
        options: {
          'include css': true,
          compress: false,
          linenos: true
        },
        files: {
          'ext/background/css/background.css': 'src/background/css/background.styl',
          'ext/content/css/content.css': 'src/content/css/content.styl'
        }
      },
      production: {
        options: {
          'include css': true
        },
        files: {
          'ext/background/css/background.css': 'src/background/css/background.styl',
          'ext/content/css/content.css': 'src/content/css/content.styl'
        }
      }
    },
    jshint: {
      development: [
        'src/content/js/*.js',
        'src/background/js/*.js'
      ],
      production: [
        'ext/content/js/*.js',
        'ext/background/js/*.js'
      ]
    },
    concat: {
      background: {
        src: dependencies.background.js,
        dest: 'ext/background/js/background.js'
      },
      content: {
        src: dependencies.content.js,
        dest: 'ext/content/js/content.js'
      }
    },
    compress: {
      all: {
        options: {
          archive: 'build/<%= pkg.name %>-<%= manifestContents.version %>.zip'
        },
        files: [
          {src: ['ext/**']}
        ]
      }
    }
  });

  grunt.registerTask('manifest:development', 'Build chrome manifest life.', function() {
    var manifest = grunt.file.readJSON('src/manifest.json')

    // Load content script on localhost
    manifest.content_scripts[0].matches.push('http://localhost/gmail/*')
    manifest.content_scripts[0].matches.push('https://localhost/gmail/*')

    // Change content scripts
    manifest.content_scripts[0].js = dependencies.content.js
    manifest.content_scripts[0].css = dependencies.content.css

    // Change background scripts
    manifest.background.scripts = dependencies.background.js
    manifest.background.styles = dependencies.background.css

    grunt.file.write('ext/manifest.json', JSON.stringify(manifest))

    grunt.file.write('src/background/js/environment.js', 'var ENV = "development"')
  })

  grunt.registerTask('manifest:production', 'Build chrome manifest life.', function() {
    var manifest = grunt.file.readJSON('src/manifest.json')

    // Leave everything as it is

    grunt.file.write('ext/manifest.json', JSON.stringify(manifest))

    grunt.file.write('src/background/js/environment.js', 'var ENV = "production"')
  })


  // Development mode
  grunt.registerTask('development', [
    'manifest:development',
    'stylus:development',
    'watch'
  ]);
  // alias
  grunt.registerTask('d', ['development'])


  // Testing
  // TODO add unit tests
  grunt.registerTask('test', [
    'jshint'
  ]);
  // alias
  grunt.registerTask('t', ['test'])


  // Optimize and compress
  grunt.registerTask('production', [
    'manifest:production',
    'stylus:production',
    'concat'
  ]);
  // alias
  grunt.registerTask('p', ['production'])


  // Creates extension zip archive
  grunt.registerTask('build', [
    'production',
    'compress'
  ]);
  // alias
  grunt.registerTask('b', ['build']);


  grunt.registerTask('default', ['development']);
};
