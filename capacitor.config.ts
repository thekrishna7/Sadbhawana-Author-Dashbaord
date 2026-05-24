import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sadbhawana.authordashboard',
  appName: 'Sadbhawana Publication Author Dashboard',
  server: {
    url: 'https://sadbhawana-author-dashbaord.vercel.app/',
    cleartext: true
  }
};

export default config;