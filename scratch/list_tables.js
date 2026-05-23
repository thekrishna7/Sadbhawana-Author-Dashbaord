async function main() {
  const res = await fetch('https://wdppaupdvxrbgfwtngka.supabase.co/rest/v1/', {
    headers: {
      apikey: 'sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-',
      Authorization: 'Bearer sb_secret_dDxlWIMPDfArcKmC8P7jCA_JM4gnSS-'
    }
  });
  const data = await res.json();
  const rpcs = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
  console.log("All RPCs:", rpcs);
}
main().catch(console.error);
