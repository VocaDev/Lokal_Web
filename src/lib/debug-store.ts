import { createClient } from "@/lib/supabase/client";

export async function debugOwnedBusinesses() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("No user session found");
    return;
  }
  console.log("Current User ID:", user.id);
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, owner_id")
    .eq("owner_id", user.id);
  
  if (error) {
    console.error("Error fetching businesses:", error);
    return;
  }
  console.log("Owned Businesses:", data);
}
