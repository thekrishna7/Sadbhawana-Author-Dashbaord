async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/rest/v1/', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  const tables = ['profiles', 'books', 'author_royalties', 'withdrawal_requests', 'sales', 'royalty_transactions'];
  for (const table of tables) {
    console.log(`\n=================== ${table.toUpperCase()} ===================`);
    const schema = data.definitions[table];
    if (schema) {
      console.log(JSON.stringify(schema.properties, null, 2));
    } else {
      console.log('Not found');
    }
  }
}

main().catch(console.error);
