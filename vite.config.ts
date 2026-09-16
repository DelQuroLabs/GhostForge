import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true as unknown as string[],
    hmr: { clientPort: 443, protocol: 'wss' } as never,
  },
});
