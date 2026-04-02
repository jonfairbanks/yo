/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
    dir: './',
})

/** @type {import('jest').Config} */
const customJestConfig = {
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
    modulePathIgnorePatterns: ['<rootDir>/.next/'],
    testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
