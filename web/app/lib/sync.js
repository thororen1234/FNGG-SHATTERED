import { getData, saveData } from './data';

const SYNC_INTERVAL = 5 * 60 * 1000;

export async function syncAllDays() {
  const data = await getData();
  let updated = false;
  const newlyAdded = {};

  try {
    const res = await fetch('https://fn-shattered-codes.vercel.app/api/raw?day=all');
    if (!res.ok) {
      console.error('Failed to fetch all days, status:', res.status);
      return;
    }

    const text = await res.text();
    const lines = text.split('\n').map(l => l.trim().toUpperCase());

    const fetchedDays = {};
    let currentDay = null;

    for (const line of lines) {
      if (line.startsWith('# DAY ')) {
        currentDay = line.replace('# DAY ', '').trim();
        fetchedDays[currentDay] = [];
      } else if (/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(line)) {
        if (currentDay) {
          fetchedDays[currentDay].push(line);
        }
      }
    }

    if (Object.keys(fetchedDays).length === 0) {
      console.error('Sync failed: No valid day blocks found in the API response.');
      return;
    }

    for (const day of Object.keys(fetchedDays)) {
      const rawCodes = fetchedDays[day];
      const newSyncedCodes = Array.from(new Set(rawCodes));
      const currentCodes = data.days[day] || [];
      const previouslySynced = data.syncedCodes[day] || [];

      const manuallyAdded = currentCodes.filter(c => !previouslySynced.includes(c));
      const mergedCodes = Array.from(new Set([...newSyncedCodes, ...manuallyAdded]));

      const brandNewCodes = mergedCodes.filter(c => !currentCodes.includes(c));
      if (brandNewCodes.length > 0) {
        newlyAdded[day] = brandNewCodes;
      }

      if (
        mergedCodes.length !== currentCodes.length ||
        !mergedCodes.every(c => currentCodes.includes(c)) ||
        newSyncedCodes.length !== previouslySynced.length ||
        !newSyncedCodes.every(c => previouslySynced.includes(c))
      ) {
        if (!data.days) data.days = {};
        if (!data.syncedCodes) data.syncedCodes = {};
        data.days[day] = mergedCodes;
        data.syncedCodes[day] = newSyncedCodes;
        updated = true;
      }
    }
  } catch (err) {
    console.error('Failed to sync all days:', err);
  }

  if (updated) {
    await saveData(data);
    console.log('Sync complete, codes updated.');
  } else {
    console.log('Sync complete, no changes.');
  }

  if (Object.keys(newlyAdded).length === 0) {
    console.log('No new codes to process, skipping background processing.');
    return;
  }

  (async () => {
    try {
      const { getClearanceCookies } = await import('./cf.js');
      const { applyApprovedCodeLogic } = await import('../actions.js');

      const cookieInfo = await getClearanceCookies();

      for (const day of Object.keys(newlyAdded)) {
        for (const c of newlyAdded[day]) {
          await applyApprovedCodeLogic(day, c, cookieInfo);
        }
      }
    } catch (e) {
      console.error('Error during background processing of synced codes:', e);
    }
  })();
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