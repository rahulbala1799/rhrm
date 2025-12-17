#!/usr/bin/env node

/**
 * Script to create storage buckets in Supabase
 * Run: node scripts/setup-storage-buckets.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../apps/web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in apps/web/.env.local');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createBucket(name, options = {}) {
  const { public: isPublic = false, fileSizeLimit, allowedMimeTypes } = options;
  
  console.log(`\n📦 Creating bucket: ${name}...`);
  
  try {
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw listError;
    }
    
    const exists = existingBuckets.some(bucket => bucket.name === name);
    
    if (exists) {
      console.log(`✅ Bucket "${name}" already exists, skipping...`);
      return;
    }
    
    // Create bucket
    const { data, error } = await supabase.storage.createBucket(name, {
      public: isPublic,
      fileSizeLimit: fileSizeLimit,
      allowedMimeTypes: allowedMimeTypes || null
    });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Successfully created bucket: ${name}`);
    if (data) {
      console.log(`   - Public: ${isPublic}`);
      if (fileSizeLimit) console.log(`   - File size limit: ${fileSizeLimit}`);
      if (allowedMimeTypes) console.log(`   - Allowed MIME types: ${allowedMimeTypes.join(', ')}`);
    }
  } catch (error) {
    console.error(`❌ Error creating bucket "${name}":`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Setting up Supabase storage buckets...\n');
  console.log(`Project URL: ${supabaseUrl}\n`);
  
  try {
    // Create compliance-docs bucket
    await createBucket('compliance-docs', {
      public: false,
      fileSizeLimit: 10485760, // 10MB in bytes
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png']
    });
    
    // Create exports bucket
    await createBucket('exports', {
      public: false,
      fileSizeLimit: 52428800, // 50MB in bytes
      allowedMimeTypes: ['text/csv', 'application/vnd.ms-excel']
    });
    
    console.log('\n✅ All storage buckets created successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Configure storage policies in Supabase Dashboard > Storage > Policies');
    console.log('   2. Set up auth redirect URLs in Supabase Dashboard > Authentication > URL Configuration');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();


