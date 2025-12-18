#!/bin/bash

# Quick script to update Vercel root directory for rhrm project
# This requires a Vercel API token

PROJECT_ID="prj_lRicZQVf5y5mpZo3gQyWJHTqi7t0"
NEW_ROOT="apps/web"

echo "Updating Vercel project 'rhrm' root directory to '$NEW_ROOT'..."
echo ""

# Check if token is provided
if [ -z "$VERCEL_TOKEN" ]; then
  echo "Please provide your Vercel API token:"
  echo "  1. Get it from: https://vercel.com/account/tokens"
  echo "  2. Run: export VERCEL_TOKEN=your_token_here"
  echo "  3. Then run this script again"
  echo ""
  echo "Or run this command directly:"
  echo "  curl -X PATCH 'https://api.vercel.com/v9/projects/$PROJECT_ID' \\"
  echo "    -H 'Authorization: Bearer YOUR_TOKEN' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"rootDirectory\":\"$NEW_ROOT\"}'"
  exit 1
fi

# Make the API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"rootDirectory\":\"$NEW_ROOT\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Successfully updated root directory to '$NEW_ROOT'"
  echo ""
  echo "Now try pushing to Git and the deployment should work correctly!"
else
  echo "❌ Error updating root directory"
  echo "HTTP Code: $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi




