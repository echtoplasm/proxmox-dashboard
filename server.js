require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
const path = require('path');

const {
  PROXMOX_HOST,
  PROXMOX_PORT = '8006',
  PROXMOX_USER,
  PROXMOX_PASSWORD,
  PROXMOX_ALLOW_SELF_SIGNED = 'true',
  PORT = '5000',
} = process.env;

if (!PROXMOX_HOST || !PROXMOX_USER || !PROXMOX_PASSWORD) {
  console.error(
    'Missing Proxmox connection details. Copy .env.example to .env and fill in PROXMOX_HOST, PROXMOX_USER, PROXMOX_PASSWORD.'
  );
  process.exit(1);
}

const baseURL = `https://${PROXMOX_HOST}:${PROXMOX_PORT}/api2/json`;

const httpsAgent = new https.Agent({
  rejectUnauthorized: PROXMOX_ALLOW_SELF_SIGNED !== 'true' ? true : false,
});

const client = axios.create({ baseURL, httpsAgent, timeout: 10000 });

let ticket = null;
let csrfToken = null;
let ticketExpiresAt = 0;

async function authenticate() {
  const response = await client.post(
    '/access/ticket',
    new URLSearchParams({
      username: PROXMOX_USER,
      password: PROXMOX_PASSWORD,
    })
  );

  const { data } = response.data;
  ticket = data.ticket;
  csrfToken = data.CSRFPreventionToken;
  // Proxmox tickets are valid for 2 hours; refresh a bit early.
  ticketExpiresAt = Date.now() + 110 * 60 * 1000;
  console.log(`[proxmox] Authenticated as ${PROXMOX_USER} against ${PROXMOX_HOST}:${PROXMOX_PORT}`);
}

async function ensureAuthenticated() {
  if (!ticket || Date.now() >= ticketExpiresAt) {
    await authenticate();
  }
}

async function proxmoxRequest(method, url, { params, data } = {}) {
  await ensureAuthenticated();

  const headers = { Cookie: `PVEAuthCookie=${ticket}` };
  if (method !== 'get') {
    headers['CSRFPreventionToken'] = csrfToken;
  }

  try {
    const response = await client.request({
      method,
      url,
      params,
      data,
      headers,
    });
    return response.data.data;
  } catch (err) {
    if (err.response && err.response.status === 401) {
      // Ticket expired/invalid — re-authenticate once and retry.
      await authenticate();
      const retryHeaders = { Cookie: `PVEAuthCookie=${ticket}` };
      if (method !== 'get') {
        retryHeaders['CSRFPreventionToken'] = csrfToken;
      }
      const retryResponse = await client.request({
        method,
        url,
        params,
        data,
        headers: retryHeaders,
      });
      return retryResponse.data.data;
    }
    throw err;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

function handleError(res, err) {
  const status = err.response ? err.response.status : 500;
  const data = err.response?.data;

  console.error('[proxmox] request failed:');
  console.error('  Status:', status);
  console.error('  URL:', err.config?.url);
  console.error('  Response:', JSON.stringify(data, null, 2));

  res.status(status).json({ error: data || err.message });
}

app.get('/api/cluster/status', async (req, res) => {
  try {
    const data = await proxmoxRequest('get', '/cluster/status');
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

app.get('/api/nodes', async (req, res) => {
  try {
    const data = await proxmoxRequest('get', '/nodes');
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

app.get('/api/nodes/:node', async (req, res) => {
  try {
    const data = await proxmoxRequest('get', `/nodes/${req.params.node}/status`);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

app.get('/api/nodes/:node/vms', async (req, res) => {
  try {
    const resources = await proxmoxRequest('get', '/cluster/resources', {
      params: { type: 'vm' },
    });
    const vms = resources
      .filter(r => r.type === 'qemu' && r.node === req.params.node)
      .map(r => ({ ...r, cpus: r.maxcpu })); // match /nodes/:node/qemu shape
    res.json(vms);
  } catch (err) {
    handleError(res, err);
  }
});

app.get('/api/nodes/:node/lxc', async (req, res) => {
  try {
    const resources = await proxmoxRequest('get', '/cluster/resources', {
      params: { type: 'vm' },
    });
    res.json(resources.filter((r) => r.type === 'lxc' && r.node === req.params.node));
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/nodes/:node/lxc/:vmid/start', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const data = await proxmoxRequest('post', `/nodes/${node}/lxc/${vmid}/status/start`);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/nodes/:node/lxc/:vmid/stop', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    if (Number(vmid) === 120) {
      return res.status(403).json({ error: 'Refusing to stop the dashboard container' });
    }
    const data = await proxmoxRequest('post', `/nodes/${node}/lxc/${vmid}/status/stop`);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

app.get('/api/nodes/:node/qemu/:vmid/status', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const data = await proxmoxRequest('get', `/nodes/${node}/qemu/${vmid}/status/current`);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/nodes/:node/qemu/:vmid/start', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const data = await proxmoxRequest('post', `/nodes/${node}/qemu/${vmid}/status/start`);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

app.post('/api/nodes/:node/qemu/:vmid/stop', async (req, res) => {
  try {
    const { node, vmid } = req.params;
    const data = await proxmoxRequest('post', `/nodes/${node}/qemu/${vmid}/status/stop`);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Serve the production React build when it exists (e.g. inside Docker).
const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(buildPath, 'index.html'), err => {
    if (err) next();
  });
});

async function start() {
  try {
    await authenticate();
  } catch (err) {
    console.error('[proxmox] Initial authentication failed:', err.message);
    console.error('Server will keep running and retry authentication on the first request.');
  }

  app.listen(PORT, () => {
    console.log(`Proxmox dashboard API listening on port ${PORT}`);
  });
}

start();
