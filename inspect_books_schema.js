async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/rest/v1/', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  const booksSchema = data.definitions.books;
  if (booksSchema) {
    console.log('Books table columns:', Object.keys(booksSchema.properties));
    console.log('Books table properties detail:', JSON.stringify(booksSchema.properties, null, 2));
  } else {
    console.log('Books table schema not found in definitions.');
  }
}

main().catch(console.error);
