// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
      require('karma-junit-reporter'),
      require('karma-coverage'),
    ],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    coverageReporter: {
      reporters: [
        { type: 'lcovonly', subdir: '.' },
        { type: 'html', subdir: '.' },
        { type: 'text-summary', subdir: '.' },
        { type: 'cobertura', subdir: '.' },
      ],
      fixWebpackSourcePaths: true,
    },

    reporters: ['progress', 'kjhtml', 'junit'],
    junitReporter: {
      outputDir: 'test_reports', // results will be saved as $outputDir/$browserName.xml
      useBrowserName: false, // add browser name to report and classes names
    },
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true,
  });
};
