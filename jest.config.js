/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('jest').Config} */
module.exports = {
    // Stop running tests after `n` failures
    // bail: 5,

    // Automatically clear mock calls, instances, contexts and results before every test
    clearMocks: true,

    // Indicates whether the coverage information should be collected while executing the test
    collectCoverage: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',

    // Indicates which provider should be used to instrument code for coverage
    coverageProvider: 'babel',

    // An object that configures minimum threshold enforcement for coverage results
    // coverageThreshold: undefined,

    // A preset that is used as a base for Jest's configuration
    preset: 'jest-preset-angular',

    // The test environment that will be used for testing
    testEnvironment: 'jsdom',
}
