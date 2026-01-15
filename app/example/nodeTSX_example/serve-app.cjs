const { execSync } = require('child_process');
const path = require('path');

const distPath = path.join(__dirname, 'dist');
const port = 1001;

console.log(`Starting serve on port ${port}...`);
console.log(`Serving directory: ${distPath}`);

try {
  execSync(`serve -s "${distPath}" -p ${port}`, {
    stdio: 'inherit',
    cwd: __dirname
  });
} catch (error) {
  console.error('Failed to start serve:', error.message);
  process.exit(1);
}
