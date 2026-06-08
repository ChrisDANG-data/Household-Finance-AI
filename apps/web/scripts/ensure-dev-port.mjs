/**
 * Prevents confusing EADDRINUSE on `npm run dev` when a previous Next.js
 * process is still listening on port 3000.
 */
const PORT = Number(process.env.PORT ?? "3000");
const HOST = process.env.DEV_HOST ?? "127.0.0.1";

async function portInUse() {
  try {
    const response = await fetch(`http://${HOST}:${PORT}`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

if (await portInUse()) {
  console.error("");
  console.error(`  Port ${PORT} is already in use — a dev server is probably still running.`);
  console.error("");
  console.error("  Options:");
  console.error(`    1. Reuse it:  http://localhost:${PORT}`);
  console.error("    2. Stop it:   focus the terminal where dev is running and press Ctrl+C");
  console.error(
    `    3. Kill it:    npx kill-port ${PORT}   (then run npm run dev again)`,
  );
  console.error("");
  process.exit(1);
}
