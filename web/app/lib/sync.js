import { getData, saveData } from './data';

const SYNC_INTERVAL = 5 * 60 * 1000;

export async function syncAllDays() {
  const data = await getData();
  let updated = false;

  for (let day = 1; day <= 6; day++) {
    try {
      const res = await fetch(`https://fn-shattered-codes.vercel.app/api/raw?day=${day}`);
      if (!res.ok) continue;

      const text = await res.text();
      const rawCodes = text.split('\n')
        .map(c => c.trim().toUpperCase())
        .filter(c => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c));

      const newSyncedCodes = Array.from(new Set(rawCodes));
      const currentCodes = data.days[String(day)] || [];
      const previouslySynced = data.syncedCodes[String(day)] || [];
      const manuallyAdded = currentCodes.filter(c => !previouslySynced.includes(c));
      const mergedCodes = Array.from(new Set([...newSyncedCodes, ...manuallyAdded]));

      if (
        mergedCodes.length !== currentCodes.length ||
        !mergedCodes.every(c => currentCodes.includes(c)) ||
        newSyncedCodes.length !== previouslySynced.length ||
        !newSyncedCodes.every(c => previouslySynced.includes(c))
      ) {
        data.days[String(day)] = mergedCodes;
        data.syncedCodes[String(day)] = newSyncedCodes;
        updated = true;
      }
    } catch (err) {
      console.error(`Failed to sync day ${day}:`, err);
    }
  }

  if (updated) {
    await saveData(data);
    console.log('Sync complete, codes updated.');
  } else {
    console.log('Sync complete, no changes.');
  }
}

let syncJobStarted = false;

export function startSyncJob() {
  if (syncJobStarted) return;
  syncJobStarted = true;

  console.log('Starting background sync job (every 5 minutes)...');

  syncAllDays().catch(err => console.error('Initial sync error:', err));

  setInterval(() => {
    syncAllDays().catch(err => console.error('Scheduled sync error:', err));
  }, SYNC_INTERVAL);
}
