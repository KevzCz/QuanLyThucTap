// F:\QLTT\bun_run_script.js
// Starts/stops your dev duo on Windows, always on 5173.
//
// Web:    F:\QLTT\web    -> Vite dev server on :5173 (strict)
// Server: F:\QLTT\server -> bun server.js
//
// If re-run: kills previous children & anything else holding 5173, then starts clean.
// Prefers running Vite with *Node* (not Bun) so Vite's engine check passes.

const { spawn, execFile, exec } = require("child_process");
const fs   = require("fs");
const path = require("path");

const ROOT      = "F:\\QLTT";
const WEB_CWD   = path.join(ROOT, "web");
const API_CWD   = path.join(ROOT, "server");
const LOCK_PATH = path.join(ROOT, ".bun_run_lock.json");
const VITE_PORT = 5173;

const procs = {};
let shuttingDown = false;

// ----------- FS/Lock helpers -----------
const exists = p => { try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; } };
const readLock  = () => exists(LOCK_PATH) ? (() => { try { return JSON.parse(fs.readFileSync(LOCK_PATH, "utf8")); } catch { return null; } })() : null;
const writeLock = pids => fs.writeFileSync(LOCK_PATH, JSON.stringify({ time: Date.now(), pids }, null, 2), "utf8");

// ----------- Process helpers -----------
function isAlive(pid) {
  if (!pid || typeof pid !== "number" || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function taskkill(pid) {
  return new Promise(resolve => {
    execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, () => resolve());
  });
}

async function killPidTree(pid) {
  if (!isAlive(pid)) return;
  try { process.kill(pid, "SIGTERM"); } catch {}
  await new Promise(r => setTimeout(r, 250));
  if (isAlive(pid)) await taskkill(pid);
}

async function killFromLock() {
  const lock = readLock();
  if (!lock || !lock.pids) return;
  const list = Array.isArray(lock.pids) ? lock.pids : Object.values(lock.pids);
  for (const pid of list) await killPidTree(pid);
  try { fs.unlinkSync(LOCK_PATH); } catch {}
}

function log(name, msg) {
  const prefix = `[${name}] `;
  process.stdout.write(prefix + String(msg).replace(/\r?\n$/, "") + "\n");
}

function spawnManaged(name, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false });
  procs[name] = child;
  child.stdout.on("data", d => log(name, d.toString()));
  child.stderr.on("data", d => log(name, d.toString()));
  child.on("exit", (code, signal) => { if (!shuttingDown) log(name, `exited (code=${code} signal=${signal || "none"})`); });
  return child;
}

// ----------- Port ownership (Windows) -----------
function pshGetPidsOnPort(port) {
  return new Promise(resolve => {
    const cmd = [
      "powershell",
      "-NoProfile",
      "-Command",
      `($c=Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue) | ` +
      `Where-Object { $_.State -in 'Listen','Established' } | ` +
      `Select-Object -ExpandProperty OwningProcess`
    ];
    exec(cmd.join(" "), { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const pids = stdout.split(/\r?\n/).map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0);
      resolve(pids);
    });
  });
}

function netstatGetPidsOnPort(port) {
  return new Promise(resolve => {
    exec(`netstat -ano -p TCP`, { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const pids = new Set();
      for (const line of stdout.split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5 || parts[0] !== "TCP") continue;
        const local = parts[1];
        const state = parts[3];
        const pid   = Number(parts[4]);
        if (!Number.isFinite(pid) || pid <= 0) continue;
        if (state !== "LISTENING" && state !== "ESTABLISHED") continue;
        const m = local.match(/:(\d+)$/);
        if (!m) continue;
        if (Number(m[1]) === port) pids.add(pid);
      }
      resolve([...pids]);
    });
  });
}

async function findPidsOnPort(port) {
  const ps = await pshGetPidsOnPort(port);
  if (ps.length) return ps;
  return await netstatGetPidsOnPort(port);
}

async function waitPortFreed(port, tries = 15, delayMs = 250) {
  for (let i = 0; i < tries; i++) {
    const pids = await findPidsOnPort(port);
    if (pids.length === 0) return true;
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

async function freePort(port) {
  const pids = (await findPidsOnPort(port)).filter(pid => pid > 0);
  if (pids.length === 0) return;
  log("manager", `freeing port ${port} from PIDs: ${pids.join(", ")}`);
  for (const pid of pids) await killPidTree(pid);
  const ok = await waitPortFreed(port);
  if (!ok) {
    const still = await findPidsOnPort(port);
    throw new Error(`Port ${port} still in use by: ${still.join(", ") || "unknown"}`);
  }
}

// ----------- Node version detection -----------
function parseNodeSemver(vstr) {
  // v22.12.0 -> [22,12,0]
  const m = String(vstr || "").trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return m.slice(1).map(n => Number(n));
}
function gteSemver(a, b) {
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }
  return true;
}
function getNodeVersion() {
  return new Promise(resolve => {
    execFile("node", ["-v"], { windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      resolve(parseNodeSemver(stdout));
    });
  });
}

// ----------- Start web (prefer Node for Vite) -----------
async function startWeb() {
  const nodeVer = await getNodeVersion(); // e.g., [22,12,0]
  const needs = [20, 19, 0];              // Vite requires >=20.19 or >=22.12; we’ll check >=20.19 and >=22.12
  const alt   = [22, 12, 0];

  let useNodeForVite = false;
  if (nodeVer) {
    if (gteSemver(nodeVer, needs) || gteSemver(nodeVer, alt)) {
      useNodeForVite = true;
    }
  }

  // Always free the port before starting web
  await freePort(VITE_PORT);

  const args = ["--port", String(VITE_PORT), "--strictPort"];

  // Prefer Node binary for Vite to satisfy engine checks
  if (useNodeForVite && exists(path.join(WEB_CWD, "node_modules", "vite", "bin", "vite.js"))) {
    return spawnManaged("web", "node", [path.join("node_modules", "vite", "bin", "vite.js"), ...args], WEB_CWD);
  }

  // Fallback: run through bun script (may fail engine check with newer Vite)
  // Try to pass flags through with "--"
  return spawnManaged("web", "bun", ["run", "dev", "--", ...args], WEB_CWD);
}

// ----------- Orchestration -----------
async function startAll() {
  // Kill our previous children and anything on 5173
  await killFromLock();
  await freePort(VITE_PORT);

  // Start web
  let web = await startWeb();

  // If web exits immediately with a "port in use" message, free & retry once
  let retried = false;
  web.stderr.on("data", async (buf) => {
    const s = String(buf);
    if (!retried && /Port\s+5173\s+is\s+already\s+in\s+use/i.test(s)) {
      retried = true;
      log("manager", "detected port 5173 in use during startup; freeing & retrying once...");
      await freePort(VITE_PORT);
      try { if (isAlive(web.pid)) await taskkill(web.pid); } catch {}
      web = await startWeb();
      writeLock([web.pid, procs.server?.pid].filter(Boolean));
    }
  });

  // Start server
  const server = spawnManaged("server", "bun", ["server.js"], API_CWD);

  writeLock([web.pid, server.pid]);

  log("manager", `started web(pid ${web.pid}) on :${VITE_PORT} & server(pid ${server.pid})`);
  log("manager", `press Ctrl+C to stop`);
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log("manager", "stopping...");
  const kids = Object.values(procs).filter(Boolean);
  for (const c of kids) { try { process.kill(c.pid, "SIGTERM"); } catch {} }
  await new Promise(r => setTimeout(r, 250));
  for (const c of kids) { if (isAlive(c.pid)) await taskkill(c.pid); }
  try { fs.unlinkSync(LOCK_PATH); } catch {}
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", () => { try { fs.unlinkSync(LOCK_PATH); } catch {} });

startAll().catch(err => {
  console.error("[manager] failed:", err?.message || err);
  process.exit(1);
});
