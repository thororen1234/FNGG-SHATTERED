import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'uploaded');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

const defaultData = {
  days: {
    "1": [], "2": [], "3": [], "4": [], "5": [], "6": []
  },
  syncedCodes: {
    "1": [], "2": [], "3": [], "4": [], "5": [], "6": []
  },
  submissions: [],
  settings: {
    autoApproval: false,
    lockedDays: []
  },
  updatedAt: new Date().toISOString()
};

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => { });
  try {
    await fs.access(DATA_FILE);
  } catch (err) {
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

export async function getData() {
  await ensureDataFile();
  const content = await fs.readFile(DATA_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(content);
    if (!parsed.syncedCodes) {
      parsed.syncedCodes = { "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] };
    }
    return parsed;
  } catch (err) {
    console.error('Failed to parse data.json, returning default data:', err);
    return {
      days: { "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] },
      syncedCodes: { "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] },
      submissions: [],
      settings: { autoApproval: false, lockedDays: [] },
      updatedAt: new Date().toISOString()
    };
  }
}

export async function saveData(data) {
  data.updatedAt = new Date().toISOString();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
