async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/rest/v1/', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  
  console.log('--- SALES COLUMNS ---');
  console.log(Object.keys(data.definitions.sales.properties));
  console.log(data.definitions.sales.properties);
  
  console.log('\n--- DOCUMENTS COLUMNS ---');
  console.log(Object.keys(data.definitions.documents.properties));
  console.log(data.definitions.documents.properties);
}

main().catch(console.error);
