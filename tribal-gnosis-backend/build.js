const { exec } = require('child_process');
const path = require('path');

// Install dependencies first
exec('npm install', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error installing dependencies: ${error}`);
    return;
  }
  console.log('Dependencies installed successfully');

  // Then install dev dependencies explicitly
  exec('npm install --save-dev @types/node @types/express @types/cors typescript', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error installing dev dependencies: ${error}`);
      return;
    }
    console.log('Dev dependencies installed successfully');

    // Finally run the TypeScript compiler
    const tsc = path.join(__dirname, 'node_modules', '.bin', 'tsc');
    exec(tsc, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error during compilation: ${error}`);
        return;
      }
      if (stderr) {
        console.error(`Compilation stderr: ${stderr}`);
      }
      console.log('Compilation successful');
    });
  });
});