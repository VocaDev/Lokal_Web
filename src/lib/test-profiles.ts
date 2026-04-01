import { createClient } from "@/lib/supabase/client";

export async function testProfilesTable() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "No user";
  
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
    
  if (error) return `Error: ${error.message}`;
  return data;
}
