// Temporary env probe — verifies which env vars are available inside the test runner.
Deno.test("env probe", () => {
  const url = Deno.env.get("SUPABASE_URL");
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  console.log(`SUPABASE_URL=${url ? "set(" + url.length + ")" : "MISSING"}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${srk ? "set(" + srk.length + ")" : "MISSING"}`);
  console.log(`SUPABASE_ANON_KEY=${anon ? "set(" + anon.length + ")" : "MISSING"}`);
});
