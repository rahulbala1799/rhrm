#!/usr/bin/env node

/**
 * Script to update Vercel project root directory setting
 */

const fs = require('fs');
const https = require('https');

// Read Vercel auth token
const authPath = require('os').homedir() + '/.vercel/auth.json';
let token = '';

try {
  const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  token = authData.token || authData.tokens?.[0]?.token || '';
} catch (error) {
  console.error('Could not read Vercel auth token:', error.message);
  process.exit(1);
}

if (!token) {
  console.error('No token found in auth.json');
  process.exit(1);
}

// Project ID
const projectId = 'prj_lRicZQVf5y5mpZo3gQyWJHTqi7t0';
const newRootDirectory = ''; // Empty string means current directory

const data = JSON.stringify({
  rootDirectory: newRootDirectory
});

const options = {
  hostname: 'api.vercel.com',
  port: 443,
  path: `/v9/projects/${projectId}`,
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Successfully updated root directory to "." (current directory)');
      console.log('Response:', responseData);
    } else {
      console.error('❌ Error updating root directory');
      console.error('Status:', res.statusCode);
      console.error('Response:', responseData);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(data);
req.end();

