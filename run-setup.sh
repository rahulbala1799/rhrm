#!/bin/bash

# HR & Staff Management - Supabase Setup Script
# This script will guide you through the setup process

set -e

echo "🚀 HR & Staff Management - Supabase Setup"
echo "=========================================="
echo ""

# Check if Supabase CLI is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js first."
    exit 1
fi

echo "✅ Step 1: Login to Supabase"
echo "   This will open your browser for authentication..."
echo ""
npx supabase login

echo ""
echo "✅ Step 2: Link to your Supabase project"
echo "   Project: urewrejmncnbdxrlrjyf"
echo "   You'll be prompted for your database password"
echo ""
npx supabase link --project-ref urewrejmncnbdxrlrjyf

echo ""
echo "✅ Step 3: Running database migrations..."
echo "   This will create all tables, RLS policies, and functions"
echo ""
npx supabase db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Set up storage buckets in Supabase Dashboard:"
echo "      - compliance-docs (private, 10MB)"
echo "      - exports (private, 50MB)"
echo "   2. Configure auth redirects:"
echo "      - Site URL: http://localhost:3000"
echo "      - Redirect URL: http://localhost:3000/auth/callback"
echo "   3. Start the app:"
echo "      npm run dev:web"
echo ""


