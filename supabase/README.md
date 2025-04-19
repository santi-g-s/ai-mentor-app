# Supabase Setup for AI Mentor App

This document describes how to set up Supabase for the AI Mentor app.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up or log in
2. Create a new project
3. Choose a name and password for your project
4. Wait for the database to be provisioned

## Step 2: Run the SQL Migration

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of `migrations/sessions_table.sql` and paste it into the SQL editor
3. Run the query to create the sessions table

## Step 3: Get Your API Keys

1. Go to the API section in your Supabase dashboard
2. Find the "Project URL" and "anon public" key 
3. Add these to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Step 4: Configure Access Policies

By default, the sessions table has Row Level Security enabled but no policies defined, which means no access is allowed.

For a simple setup without authentication, you can add a policy to allow all operations:

```sql
CREATE POLICY "Allow all operations" ON sessions
FOR ALL USING (true);
```

For a production app, you would want to implement authentication and create more restrictive policies.

## Step 5: (Optional) Set Up Authentication

If you want to implement user authentication, follow the Supabase Auth documentation to set it up:
[Supabase Auth Docs](https://supabase.com/docs/guides/auth)

Then update your session table and policies to be user-specific:

```sql
-- Add user_id column to sessions table
ALTER TABLE sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create policy for user-specific access
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);
``` 