// F:\QLTT\bun_run_script.js
// Restarts your web (Vite) and server apps. Forces Vite to use port 5173.
// If 5173 is in use, this script will kill the process holding it, then start clean.
//
// Usage: node bun_run_script.js   (or)   bun bun_run_script.js

const { spawn, execFile, exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = "F:\\QLTT";
const LOCK_PATH = path.join(ROOT, ".bun_run_lock.json");
const VITE_PORT = 5173;

const procs = {};
let shuttingDown = false;

function exists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function readLock() {
  if (!exists(LOCK_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(LOCK_PATH, "utf8")); } catch { return null; }
}

function writeLock(pids) {
  fs.writeFileSync(LOCK_PATH, JSON.stringify({ time: Date.now(), pids }, null, 2), "utf8");
}

function isAlive(pid) {
  if (!pid || typeof pid !== "number") return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function taskkill(pid) {
  return new Promise((resolve) => {
    execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, () => resolve());
  });
}

async function killPidTree(pid) {
  if (!isAlive(pid)) return;
  try { process.kill(pid, "SIGTERM"); } catch {}
  await new Promise(r => setTimeout(r, 300));
  if (isAlive(pid)) await taskkill(pid);
}

async function killFromLock() {
  const lock = readLock();
  if (!lock || !lock.pids) return;
  const list = Array.isArray(lock.pids) ? lock.pids : Object.values(lock.pids);
  for (const pid of list) { await killPidTree(pid); }
  try { fs.unlinkSync(LOCK_PATH); } catch {}
}

function log(name, msg) {
  const prefix = `[${name}] `;
  process.stdout.write(prefix + String(msg).replace(/\r?\n$/, "") + "\n");
}

function spawnManaged(name, cmd, args, cwd) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell: false
  });
  procs[name] = child;
  child.stdout.on("data", (d) => log(name, d.toString()));
  child.stderr.on("data", (d) => log(name, d.toString()));
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    log(name, `exited (code=${code} signal=${signal || "none"})`);
  });
  return child;
}

// --- Port 5173 killer (Windows) ---
function findPidsOnPortWin(port) {
  return new Promise((resolve) => {
    // netstat -ano | findstr :5173
    exec(`netstat -ano | findstr :${port}`, { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      const pids = new Set();
      for (const line of lines) {
        // Example:  TCP    0.0.0.0:5173     0.0.0.0:0       LISTENING       12345
        const parts = line.trim().split(/\s+/);
        const pidStr = parts[parts.length - 1];
        const pid = Number(pidStr);
        if (!Number.isNaN(pid)) pids.add(pid);
      }
      resolve([...pids]);
    });
  });
}

async function freePort(port) {
  const pids = await findPidsOnPortWin(port);
  if (pids.length === 0) return;
  log("manager", `freeing port ${port} from PIDs: ${pids.join(", ")}`);
  for (const pid of pids) {
    await killPidTree(pid);
  }
  // double-check
  const still = await findPidsOnPortWin(port);
  if (still.length) {
    throw new Error(`Port ${port} still in use by: ${still.join(", ")}`);
  }
}

async function startAll() {
  // 1) Kill previously launched children (from our lock file)
  await killFromLock();

  // 2) Ensure Vite's 5173 is free
  await freePort(VITE_PORT);

  // 3) Start web with strict port 5173
  // If your package.json has "dev": "vite" or "vite --open", passing flags works as:
  //   bun run dev -- --port 5173 --strictPort
  // This forwards flags to the underlying vite command.
  const web = spawnManaged(
    "web",
    "bun",
    ["run", "dev", "--", "--port", String(VITE_PORT), "--strictPort"],
    path.join(ROOT, "web")
  );

  // 4) Start server
  const server = spawnManaged(
    "server",
    "bun",
    ["server.js"],
    path.join(ROOT, "server")
  );

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
  await new Promise(r => setTimeout(r, 300));
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
