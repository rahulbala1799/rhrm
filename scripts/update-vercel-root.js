#!/usr/bin/env node

/**
 * Script to update Vercel project root directory setting
 */

const fs = require('fs');
const https = require('https');

// Read Vercel auth token from multiple possible locations
const os = require('os');
const path = require('path');

const possibleAuthPaths = [
  path.join(os.homedir(), '.vercel', 'auth.json'),
  path.join(os.homedir(), '.config', 'vercel', 'auth.json'),
];

let token = '';

for (const authPath of possibleAuthPaths) {
  try {
    if (fs.existsSync(authPath)) {
      const authData = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      token = authData.token || authData.tokens?.[0]?.token || '';
      if (token) break;
    }
  } catch (error) {
    // Continue to next path
  }
}

// If still no token, try to get it from environment or prompt user
if (!token) {
  token = process.env.VERCEL_TOKEN || '';
}

if (!token) {
  console.error('❌ Could not find Vercel API token automatically.');
  console.error('');
  console.error('Please get your Vercel API token from:');
  console.error('  https://vercel.com/account/tokens');
  console.error('');
  console.error('Then either:');
  console.error('  1. Set VERCEL_TOKEN environment variable and run this script again');
  console.error('  2. Or update the root directory in Vercel Dashboard:');
  console.error('     Settings → General → Root Directory → Set to "apps/web"');
  process.exit(1);
}

// Project ID for rhrm project
const projectId = 'prj_lRicZQVf5y5mpZo3gQyWJHTqi7t0';
const newRootDirectory = 'apps/web'; // Set to apps/web for monorepo

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
      console.log('✅ Successfully updated root directory to "apps/web"');
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

