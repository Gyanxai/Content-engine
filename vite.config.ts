import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-mock',
      configureServer(server) {
        server.middlewares.use(async (req: any, res: any, next: () => void) => {
          if (req.url === '/api/create-admin' && (req.method === 'POST' || req.method === 'PATCH')) {
            let body = '';
            req.on('data', (chunk: Buffer) => body += chunk);
            req.on('end', async () => {
              try {
                req.body = JSON.parse(body || '{}');
                // Use absolute path to ensure Node finds the module correctly
                const apiPath = require.resolve('./api/create-admin.cjs');
                // Clear cache to allow for hot-reloading of the API script
                delete require.cache[apiPath];
                const createAdminApi = require(apiPath);
                await createAdminApi(req, res);
              } catch (err: any) {
                console.error('API Middleware Error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
  build: {
    target: 'esnext',
  },
});
