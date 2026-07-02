const { spawn } = require('node:child_process');
const net = require('node:net');

const host = '127.0.0.1';
const startPort = Number(process.env.ACRO_DEV_PORT || 5173);

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

async function findPort() {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found from ${startPort} to ${startPort + 49}`);
}

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  });
  return child;
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Retry until Vite is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  const port = await findPort();
  const devUrl = `http://${host}:${port}`;
  const env = { ...process.env, ACRO_DEV_URL: devUrl };

  console.log(`[dev] Vite URL: ${devUrl}`);
  const vite = run('npx', ['vite', '--host', host, '--port', String(port), '--strictPort'], { env });

  const shutdown = () => {
    vite.kill();
    electron?.kill();
  };

  let electron;
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await waitForServer(devUrl);
    electron = run('npx', ['electron', '.'], { env });

    const exitWith = (code) => {
      vite.kill();
      process.exit(code ?? 0);
    };

    vite.on('exit', exitWith);
    electron.on('exit', exitWith);
  } catch (error) {
    console.error(`[dev] ${error instanceof Error ? error.message : error}`);
    shutdown();
    process.exit(1);
  }
}

main();
