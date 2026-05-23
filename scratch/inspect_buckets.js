async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/storage/v1/bucket', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  console.log("Storage buckets:", data);
}
main().catch(console.error);
