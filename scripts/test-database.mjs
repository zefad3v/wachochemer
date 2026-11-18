import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
const db=new PGlite();
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role supabase_auth_admin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
    create table auth.mfa_factors (
      id uuid primary key, user_id uuid not null references auth.users(id),
      factor_type text not null, status text not null,
      created_at timestamptz not null, updated_at timestamptz not null
    );
    create function auth.jwt() returns jsonb language sql stable as $$
      select nullif(current_setting('request.jwt.claims', true), '')::jsonb;
    $$;
    create function auth.uid() returns uuid language sql stable as $$
      select (auth.jwt()->>'sub')::uuid;
    $$;
  `);
  for (const file of readdirSync('supabase/migrations').sort())
    await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
  for (const file of readdirSync('supabase/tests').filter(f=>f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync('supabase/tests/'+file,'utf8'));
    console.log('PASS '+file);
  }
} finally { await db.close(); }
