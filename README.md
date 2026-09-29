# Proxmox Cluster Dashboard

A touch-optimized dashboard for monitoring and managing a Proxmox VE cluster. Built for small
displays (e.g. a 6" wall-mounted touchscreen) with a React frontend and an Express backend that
proxies the Proxmox API.

## Features

- **Cluster Status** — cluster name, quorum status, node count, and member list.
- **Nodes** — per-node CPU / memory / disk usage, refreshed every 5 seconds.
- **VM Manager** — list VMs per node with one-tap Start/Stop controls.

## Requirements

- Node.js 18+
- A Proxmox VE host reachable from this machine, and a user with API permissions
  (e.g. `root@pam`, or a dedicated user with `PVEVMAdmin`/`PVEAuditor` roles).

## Setup

```bash
npm install
cp .env.example .env
# edit .env with your Proxmox host, user, and password
npm run dev
```

`npm run dev` runs the Express API (port 5000) and the React dev server (port 3000, proxying
`/api/*` to the backend) concurrently. Open http://localhost:3000.

## Environment variables (`.env`)

| Variable                    | Description                                              |
| ---------------------------- | --------------------------------------------------------- |
| `PROXMOX_HOST`               | IP or hostname of the Proxmox host (e.g. `192.168.1.167`) |
| `PROXMOX_PORT`               | API port, defaults to `8006`                              |
| `PROXMOX_USER`               | API user, e.g. `root@pam`                                 |
| `PROXMOX_PASSWORD`           | Password for the API user                                 |
| `PROXMOX_ALLOW_SELF_SIGNED`  | `true` (default) to accept Proxmox's self-signed cert      |
| `PORT`                       | Port for the Express server, defaults to `5000`            |

## Production build

```bash
npm run build   # builds the React app into ./build
npm start        # serves the built app + API from a single Express process on $PORT
```

## Docker

```bash
cp .env.example .env
# edit .env
docker compose up -d --build
```

The container serves the full app (frontend + API) on port 5000.

## API endpoints

| Method | Path                                        | Description                     |
| ------ | -------------------------------------------- | -------------------------------- |
| GET    | `/api/cluster/status`                        | Cluster status and members       |
| GET    | `/api/nodes`                                 | List all nodes with metrics      |
| GET    | `/api/nodes/:node`                           | Single node status               |
| GET    | `/api/nodes/:node/vms`                       | List VMs on a node                |
| GET    | `/api/nodes/:node/qemu/:vmid/status`          | Current status of a VM            |
| POST   | `/api/nodes/:node/qemu/:vmid/start`           | Start a VM                        |
| POST   | `/api/nodes/:node/qemu/:vmid/stop`            | Stop a VM                         |

## Notes

- The backend authenticates against the Proxmox API on startup using a ticket + CSRF token, and
  automatically re-authenticates if the ticket expires or is rejected.
- Proxmox's default self-signed certificate is accepted by default (`PROXMOX_ALLOW_SELF_SIGNED=true`).
  Set it to `false` if your host has a trusted certificate.
