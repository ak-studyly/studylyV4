import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// This client uses the service_role key and bypasses RLS entirely.
// NEVER import this file from a client component or expose the key
// to the browser. It must only be used inside API routes / server code.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
