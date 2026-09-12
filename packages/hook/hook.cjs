// @ts-nocheck
// hook.cjs — Zero-dependency CommonJS, ships inside the VSIX.
//
// Reads stdin JSON, writes one JSON line to the Dwell IPC socket, exits 0.
// ALWAYS exits 0. ALWAYS prints nothing. A hook that can block, slow,
// or perturb Claude Code is an unshippable hook.

'use strict';

const net = require('net');
const os = require('os');
const path = require('path');

// Total budget: 15ms typical
const STDIN_TIMEOUT_MS = 50;
const CONNECT_TIMEOUT_MS = 20;

/**
 * Get the IPC socket path.
 * POSIX: ${XDG_RUNTIME_DIR:-/tmp}/dwell-${uid}.sock
 * Windows: \\.\pipe\dwell-<username>
 */
function getSocketPath() {
  if (process.env.DWELL_SOCKET_PATH) {
    return process.env.DWELL_SOCKET_PATH;
  }
  if (process.platform === 'win32') {
    return '\\\\.\\pipe\\dwell-' + os.userInfo().username;
  }
  var runtimeDir = process.env.XDG_RUNTIME_DIR || '/tmp';
  return path.join(runtimeDir, 'dwell-' + process.getuid() + '.sock');
}

/**
 * Read all of stdin with a timeout.
 * Returns a Promise that resolves to the stdin string or '' on timeout.
 */
function readStdin() {
  return new Promise(function (resolve) {
    var chunks = [];
    var done = false;

    var timer = setTimeout(function () {
      if (!done) {
        done = true;
        process.stdin.removeAllListeners();
        process.stdin.destroy();
        resolve(chunks.join(''));
      }
    }, STDIN_TIMEOUT_MS);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (chunk) {
      chunks.push(chunk);
    });
    process.stdin.on('end', function () {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(chunks.join(''));
      }
    });
    process.stdin.on('error', function () {
      if (!done) {
        done = true;
        clearTimeout(timer);
        resolve(chunks.join(''));
      }
    });

    process.stdin.resume();
  });
}

/**
 * Send a JSON line to the IPC socket.
 * Connect timeout 20ms. If nothing is listening, give up silently.
 */
function sendToSocket(socketPath, frame) {
  return new Promise(function (resolve) {
    var timer = setTimeout(function () {
      socket.destroy();
      resolve();
    }, CONNECT_TIMEOUT_MS);

    var socket = net.createConnection(socketPath, function () {
      clearTimeout(timer);
      socket.end(JSON.stringify(frame) + '\n', function () {
        resolve();
      });
    });

    socket.on('error', function () {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function main() {
  try {
    // Read the hook event name from argv
    var hookEvent = process.argv[2] || 'unknown';

    // Read stdin payload
    var raw = await readStdin();
    if (!raw || !raw.trim()) {
      process.exit(0);
      return;
    }

    // Parse JSON
    var payload;
    try {
      payload = JSON.parse(raw);
    } catch (_e) {
      // Malformed JSON — exit silently
      process.exit(0);
      return;
    }

    // Build frame with camelCase fields
    var frame = {
      v: 1,
      event: hookEvent,
      sessionId: payload.session_id || payload.sessionId || '',
      cwd: payload.cwd || process.cwd(),
      ts: Date.now()
    };

    // Send to socket
    var socketPath = getSocketPath();
    await sendToSocket(socketPath, frame);
  } catch (_e) {
    // All errors silently ignored
  }

  process.exit(0);
}

main();
