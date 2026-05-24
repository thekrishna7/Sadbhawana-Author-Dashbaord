async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/rest/v1/', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  
  const documents = data.definitions.documents;
  if (documents) {
    console.log('--- DOCUMENTS COLUMNS ---');
    console.log(Object.keys(documents.properties));
  } else {
    console.log('Documents table schema not found.');
  }

  const sales = data.definitions.sales;
  if (sales) {
    console.log('--- SALES COLUMNS ---');
    console.log(Object.keys(sales.properties));
  } else {
    console.log('Sales table schema not found.');
  }
}

main().catch(console.error);
