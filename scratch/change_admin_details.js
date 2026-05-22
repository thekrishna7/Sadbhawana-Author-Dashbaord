const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: node scratch/change_admin_details.js <new_email> <new_password> [new_full_name]");
  console.log("Example: node scratch/change_admin_details.js admin@example.com mysecretpass123 'Admin User'");
  process.exit(1);
}

const newEmail = args[0];
const newPassword = args[1];
const newFullName = args[2] || null;

// Load .env.local
const envPath = path.join(__dirname, "../.env.local");
let url = "";
let key = "";

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      url = line.split("=")[1].trim();
    }
    if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
      key = line.split("=")[1].trim();
    }
  }
}

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  // 1. Find the super admin profile
  const { data: admins, error: findError } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "super_admin");

  if (findError || !admins || admins.length === 0) {
    console.error("Error finding super admin profile:", findError || "No super_admin found.");
    process.exit(1);
  }

  const adminUser = admins[0];
  console.log(`Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);
  console.log(`Updating credentials to:`);
  console.log(`- Email: ${newEmail}`);
  console.log(`- Password: [HIDDEN]`);
  if (newFullName) console.log(`- Name: ${newFullName}`);

  // 2. Update Supabase Auth user
  const updateData = {
    email: newEmail,
    password: newPassword,
  };
  if (newFullName) {
    updateData.user_metadata = { full_name: newFullName };
  }

  const { data: updatedAuthUser, error: authError } = await supabase.auth.admin.updateUserById(
    adminUser.id,
    updateData
  );

  if (authError) {
    console.error("Error updating Auth credentials:", authError.message);
    process.exit(1);
  }

  console.log("Auth credentials updated successfully.");

  // 3. Update profiles table
  const profileUpdate = {
    email: newEmail,
  };
  if (newFullName) {
    profileUpdate.full_name = newFullName;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", adminUser.id);

  if (profileError) {
    console.error("Error updating profiles database record:", profileError.message);
    process.exit(1);
  }

  console.log("Profiles database record updated successfully.");
  console.log("----------------------------------------------");
  console.log("ADMIN LOGIN DETAILS UPDATED SUCCESSFULLY!");
}

main();
