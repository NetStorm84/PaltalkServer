const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('Paltalk Server Test Runner');
console.log('==========================');

// Get all test files excluding this runner
const testDir = __dirname;
const testFiles = fs.readdirSync(testDir)
  .filter(file => file.startsWith('test_') && file.endsWith('.js') && file !== 'test_runner.js')
  .map(file => path.join(testDir, file));

if (testFiles.length === 0) {
  console.log('No test files found in the tests directory!');
  process.exit(1);
}

console.log(`Found ${testFiles.length} test files\n`);

// Run tests sequentially
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const testFile of testFiles) {
    const fileName = path.basename(testFile);
    process.stdout.write(`Running ${fileName}... `);
    
    try {
      const result = await new Promise((resolve) => {
        const test = spawn('node', [testFile]);
        
        let output = '';
        test.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        let errorOutput = '';
        test.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        test.on('close', (code) => {
          resolve({
            code,
            output,
            errorOutput
          });
        });
      });
      
      if (result.code === 0) {
        console.log('\x1b[32mPASSED\x1b[0m');
        passed++;
      } else {
        console.log('\x1b[31mFAILED\x1b[0m');
        console.log('\nError output:');
        console.log(result.errorOutput || result.output);
        failed++;
      }
    } catch (err) {
      console.log('\x1b[31mFAILED\x1b[0m');
      console.log(`\nError: ${err.message}`);
      failed++;
    }
  }
  
  console.log('\n==========================');
  console.log(`Tests complete: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(`Test runner error: ${err.message}`);
  process.exit(1);
});
