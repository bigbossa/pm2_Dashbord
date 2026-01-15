import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3000;

// Proxy configuration for Vite dev server with HMR
const viteProxyConfig = {
  target: 'http://localhost:1001',
  changeOrigin: true,
  ws: true, // Enable WebSocket for HMR
  logLevel: 'silent',
  onProxyReq: (proxyReq, req, res) => {
    // Fix Vite HMR
    if (req.headers['accept'] === 'text/html') {
      proxyReq.setHeader('accept', 'text/html');
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Fix CORS and paths
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
  }
};

// Proxy configuration for Next.js
const nextProxyConfig = {
  target: 'http://localhost:1002',
  changeOrigin: true,
  ws: true,
  timeout: 300000, // 300 seconds (5 minutes)
  proxyTimeout: 300000,
  logLevel: 'silent'
};

// Route: /api -> Backend API (port 2001)
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:2001',
  changeOrigin: true,
  logLevel: 'silent'
}));

// Route: /homecare -> HomeCare Frontend (port 1001) with Vite HMR
app.use('/homecare', createProxyMiddleware(viteProxyConfig));

// Route: /repair -> Repair System (port 1002)
app.use('/repair', createProxyMiddleware(nextProxyConfig));

// Route: /autopo -> AutoPO System (port 1003)
app.use('/autopo', createProxyMiddleware({
  target: 'http://localhost:1003',
  changeOrigin: true,
  pathRewrite: { '^/autopo': '' },
  logLevel: 'silent'
}));
// Route: /autopo -> AutoPO System (port 1003)
app.use('/ycsalescrm', createProxyMiddleware({
  target: 'http://localhost:1004',
  changeOrigin: true,
  pathRewrite: { '^/ycsalescrm': '' },
  logLevel: 'silent'
}));

// Route: / -> Dashboard (port 1000)
app.use('/', createProxyMiddleware({
  target: 'http://localhost:1000',
  changeOrigin: true,
  logLevel: 'silent'
}));

const server = app.listen(PORT, () => {
  console.log('');
  console.log('============================================================');
  console.log('🚀 PROXY SERVER IS RUNNING');
  console.log('============================================================');
  console.log(`   📍 Main:      http://localhost:${PORT}`);
  console.log(`   📍 Dashboard: http://localhost:${PORT}/`);
  console.log(`   📍 HomeCare:  http://localhost:${PORT}/homecare`);
  console.log(`   📍 Repair:    http://localhost:${PORT}/repair`);
  console.log(`   📍 AutoPO:    http://localhost:${PORT}/autopo`);
  console.log(`   📍 API:       http://localhost:${PORT}/api`);
  console.log('============================================================');
  console.log('   ⚡ HMR enabled for Vite and Next.js');
  console.log('============================================================');
  console.log('');
});

// Enable WebSocket upgrade
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/homecare')) {
    // Vite HMR WebSocket
    createProxyMiddleware(viteProxyConfig).upgrade(req, socket, head);
  } else if (req.url.startsWith('/repair')) {
    // Next.js HMR WebSocket
    createProxyMiddleware(nextProxyConfig).upgrade(req, socket, head);
  }
});
