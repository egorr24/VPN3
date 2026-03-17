const express = require('express');
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Proxy middleware for VPN functionality
const proxyMiddleware = createProxyMiddleware({
  target: 'http://httpbin.org', // Default target
  changeOrigin: true,
  router: (req) => {
    // Extract target from headers or query params
    const target = req.headers['x-target-url'] || req.query.target;
    return target || 'http://httpbin.org';
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add headers for VPN functionality
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Real-IP', req.ip);
    console.log(`Proxying request to: ${proxyReq.getHeader('host')}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
});

// Main page
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>FluxVPN Server</title></head>
      <body style="font-family: Arial; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <h1>🔒 FluxVPN Server</h1>
        <p>Ваш личный VPN сервер работает!</p>
        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>API Endpoints:</h3>
          <ul>
            <li><a href="/api/vpn/status" style="color: #fff;">GET /api/vpn/status</a> - статус сервера</li>
            <li><a href="/api/vpn/test" style="color: #fff;">GET /api/vpn/test</a> - тест подключения</li>
            <li>ALL /proxy/* - прокси для всех запросов</li>
          </ul>
        </div>
        <p>Установите Chrome расширение для использования VPN!</p>
      </body>
    </html>
  `);
});

// VPN Proxy routes
app.use('/proxy/*', (req, res, next) => {
  // Extract target URL from path
  const targetUrl = req.path.replace('/proxy/', '');
  if (targetUrl) {
    req.headers['x-target-url'] = decodeURIComponent(targetUrl);
  }
  next();
}, proxyMiddleware);

// API endpoint for VPN status
app.get('/api/vpn/status', (req, res) => {
  res.json({
    status: 'active',
    server: req.get('host'),
    timestamp: new Date().toISOString(),
    clientIP: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
});

// API endpoint for VPN connection test
app.get('/api/vpn/test', (req, res) => {
  res.json({
    success: true,
    message: 'VPN server is working perfectly!',
    yourIP: req.ip || req.connection.remoteAddress,
    server: req.get('host'),
    timestamp: new Date().toISOString(),
    headers: {
      'user-agent': req.get('User-Agent'),
      'x-forwarded-for': req.get('X-Forwarded-For'),
      'x-real-ip': req.get('X-Real-IP')
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

server.listen(PORT, () => {
  console.log(`🔒 FluxVPN Server running on port ${PORT}`);
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 API Status: http://localhost:${PORT}/api/vpn/status`);
});