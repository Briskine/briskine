exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  jasmineNodeOpts: {
    specs: ['src/tests/*spec.js']
  }
}

