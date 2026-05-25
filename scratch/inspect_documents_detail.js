async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/rest/v1/', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  const documentsSchema = data.definitions.documents;
  if (documentsSchema) {
    console.log('Documents table properties detail:', JSON.stringify(documentsSchema.properties, null, 2));
  } else {
    console.log('Documents table schema not found.');
  }
}

main().catch(console.error);
