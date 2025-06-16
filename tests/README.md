# Paltalk Server Tests

This directory contains test files for the Paltalk Server application.

## Available Tests

- `test_get_uin.js` - Tests user ID lookup functionality
- `test_room_messages.js` - Tests room messaging system
- `test_user_lookup.js` - Tests user lookup functionality
- `test_buddy_status.js` - Comprehensive buddy status system test
- `test_buddy_simple.js` - Simple buddy status demonstration test

## Running Tests

You can run all tests using:

```bash
npm test
```

Or run a specific test:

```bash
node tests/test_get_uin.js
```

## Buddy Status Tests

The buddy status tests demonstrate the real-time status broadcasting functionality:

```bash
# Simple demonstration test
node tests/test_buddy_simple.js

# Comprehensive buddy status test
node tests/test_buddy_status.js
```

**Note**: These tests require the server to be running on port 5001. Make sure to start the server first:

```bash
node src/server.js
```

## Creating New Tests

1. Copy `test_template.js` to create a new test file using the naming convention `test_[feature_name].js`
2. Implement your test cases
3. The test should exit with code 0 if successful, or code 1 if tests fail

## Test Structure

Each test should:

1. Set up any required test environment
2. Run test cases with appropriate assertions
3. Clean up the test environment
4. Exit with the appropriate code (0 for success, 1 for failure)

## Best Practices

1. Keep tests focused on a single feature or function
2. Use descriptive test names
3. Use assertions to validate results
4. Clean up any resources used during tests
5. Keep tests independent (one test should not depend on another)

## Test Runner

The `test_runner.js` file executes all test files in this directory and reports results. It:

1. Finds all files with the prefix `test_` and suffix `.js`
2. Runs each test file sequentially
3. Reports which tests passed or failed
4. Provides an overall summary
