async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/rest/v1/', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  const docSchema = data.definitions.documents;
  if (docSchema && docSchema.properties && docSchema.properties.category) {
    console.log("Category schema detail:", JSON.stringify(docSchema.properties.category, null, 2));
  } else {
    console.log("Documents category column schema not found.");
  }
}

main().catch(console.error);
