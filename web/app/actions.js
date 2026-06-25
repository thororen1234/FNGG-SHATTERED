'use server';

import { getEventData, saveEventData } from './lib/data';

export async function saveLateFound(formData) {
  const day = formData.get('day');
  const raw = formData.get('codes') || '';
  const mode = formData.get('mode');
  const chapter = formData.get('chapter');
  const season = formData.get('season');

  const codes = raw.split('\n')
    .map(c => c.trim().toUpperCase())
    .filter(c => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c));

  const data = await getEventData(mode, chapter, season);
  if (!data.lateFound) {
    data.lateFound = { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [] };
  }
  data.lateFound[String(day)] = codes;
  await saveEventData(mode, chapter, season, data);
  return { success: true, count: codes.length };
}
