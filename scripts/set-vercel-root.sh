#!/bin/bash

# Script to set Vercel project root directory using Vercel CLI
# This uses the Vercel API directly

PROJECT_ID="prj_lRicZQVf5y5mpZo3gQyWJHTqi7t0"
NEW_ROOT_DIRECTORY="apps/web"

echo "Setting root directory for project 'rhrm' to '$NEW_ROOT_DIRECTORY'..."

# Try to get token from Vercel CLI
# First, try to get it from the auth file
TOKEN=""
AUTH_PATHS=(
  "$HOME/.vercel/auth.json"
  "$HOME/.config/vercel/auth.json"
)

for AUTH_PATH in "${AUTH_PATHS[@]}"; do
  if [ -f "$AUTH_PATH" ]; then
    TOKEN=$(node -e "const fs = require('fs'); const auth = JSON.parse(fs.readFileSync('$AUTH_PATH', 'utf8')); console.log(auth.token || auth.tokens?.[0]?.token || '');" 2>/dev/null)
    if [ -n "$TOKEN" ]; then
      break
    fi
  fi
done

if [ -z "$TOKEN" ]; then
  echo "❌ Could not find Vercel API token automatically."
  echo ""
  echo "Please get your Vercel API token from:"
  echo "  https://vercel.com/account/tokens"
  echo ""
  echo "Then run this command:"
  echo "  curl -X PATCH 'https://api.vercel.com/v9/projects/$PROJECT_ID' \\"
  echo "    -H 'Authorization: Bearer YOUR_TOKEN_HERE' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"rootDirectory\":\"$NEW_ROOT_DIRECTORY\"}'"
  exit 1
fi

# Update the project
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"rootDirectory\":\"$NEW_ROOT_DIRECTORY\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Successfully updated root directory to '$NEW_ROOT_DIRECTORY'"
  echo "Response: $BODY"
else
  echo "❌ Error updating root directory"
  echo "HTTP Code: $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi


