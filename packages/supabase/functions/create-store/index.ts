import { createClient } from 'jsr:@supabase/supabase-js@2'
import { createHandler } from './handler.ts'

Deno.serve(createHandler(createClient, (name) => Deno.env.get(name)))
