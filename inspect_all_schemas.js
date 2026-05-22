async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/rest/v1/', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  console.log("Available tables:", Object.keys(data.definitions));
  for (const [table, val] of Object.entries(data.definitions)) {
    console.log(`\n--- TABLE: ${table} ---`);
    if (val.properties) {
      for (const [propName, propVal] of Object.entries(val.properties)) {
        if (propVal.description && propVal.description.includes("Key")) {
          console.log(`  ${propName}: ${propVal.description.replace(/\n/g, " ")}`);
        }
      }
    }
  }
}

main().catch(console.error);
