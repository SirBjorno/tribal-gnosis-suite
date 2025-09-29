const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the .env file
dotenv.config({ path: path.join(__dirname, '.env') });

// Set working directory
process.chdir(__dirname);

// Now require and start the main server
require('./dist/index.js');