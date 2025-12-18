# Installing Supabase CLI

Supabase CLI cannot be installed via `npm install -g`. Use one of these methods:

## Option 1: Homebrew (macOS - Recommended)

```bash
brew install supabase/tap/supabase
```

## Option 2: npm (as project dependency)

```bash
# Install in your project
npm install supabase --save-dev

# Then use via npx
npx supabase --version
```

## Option 3: Direct Download

Visit: https://github.com/supabase/cli/releases

Download the binary for your OS and add to PATH.

## Verify Installation

```bash
supabase --version
# or
npx supabase --version
```

## After Installation

1. Login: `supabase login`
2. Link project: `supabase link --project-ref urewrejmncnbdxrlrjyf`
3. Run migrations: `supabase db push`




