import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0', // accessible as http://192.168.0.10:3000 on local network
        /** Dev-only: forward OpenAI calls without exposing the key in the browser (see services/politicianOpenAiService.ts). */
        proxy: {
          '/openai-proxy': {
            target: 'https://api.openai.com',
            changeOrigin: true,
            secure: true,
            rewrite: (path) => path.replace(/^\/openai-proxy/, ''),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                const key = env.VITE_OPENAI_API_KEY;
                if (key) proxyReq.setHeader('Authorization', `Bearer ${key}`);
              });
            },
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
