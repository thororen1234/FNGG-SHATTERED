export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startSyncJob } = await import('./app/lib/sync.js');
    startSyncJob();
  }
}
