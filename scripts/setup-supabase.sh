#!/bin/bash

# Supabase Setup Script
# This script helps set up your Supabase project and run migrations

set -e

echo "🚀 HR & Staff Management - Supabase Setup"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "   Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase"
    echo "   Run: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Ask for project reference
read -p "Enter your Supabase project reference (or press Enter to use local): " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo ""
    echo "📦 Using local Supabase..."
    echo ""
    
    # Check if local Supabase is running
    if ! supabase status &> /dev/null; then
        echo "Starting local Supabase..."
        supabase start
    else
        echo "✅ Local Supabase is running"
    fi
    
    echo ""
    echo "🔄 Resetting database (applies all migrations)..."
    supabase db reset
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Local Supabase URLs:"
    supabase status
else
    echo ""
    echo "🔗 Linking to remote project: $PROJECT_REF"
    supabase link --project-ref "$PROJECT_REF"
    
    echo ""
    echo "🔄 Pushing migrations to remote database..."
    supabase db push
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Your Supabase project is ready!"
    echo "Don't forget to:"
    echo "  1. Set up storage buckets (compliance-docs, exports)"
    echo "  2. Configure auth redirect URLs"
    echo "  3. Set environment variables in apps/web/.env.local"
fi

echo ""
echo "📚 Next steps:"
echo "  1. Create .env.local in apps/web/ with your Supabase credentials"
echo "  2. Run: npm run dev:web"
echo "  3. Visit http://localhost:3000"
echo ""




