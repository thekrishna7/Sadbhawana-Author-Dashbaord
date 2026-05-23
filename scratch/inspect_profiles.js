async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/rest/v1/', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  console.log("activity_logs schema:");
  console.log(JSON.stringify(data.definitions.activity_logs?.properties, null, 2));
  console.log("\nnotifications schema:");
  console.log(JSON.stringify(data.definitions.notifications?.properties, null, 2));
}
main().catch(console.error);
