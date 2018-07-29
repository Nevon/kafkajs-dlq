module.exports = {
  verbose: !!process.env.VERBOSE,
  moduleNameMapper: {
    testHelpers: "<rootDir>/testHelpers/index.js"
  },
  setupTestFrameworkScriptFile: "<rootDir>/testHelpers/setup.js",
  testPathIgnorePatterns: ["/node_modules/"],
  testEnvironment: "node",
  testRegex: "(/__tests__/.*|(\\.|/)spec)\\.jsx?$",
  bail: true
};
