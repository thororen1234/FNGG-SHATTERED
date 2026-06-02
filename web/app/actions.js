'use server';

import { cookies } from 'next/headers';
import { encrypt, verifyPassword } from './lib/auth';
import { getData, saveData } from './lib/data';
import { randomUUID } from 'crypto';
import { syncAllDays } from './lib/sync';
import { getClearanceCookies, invalidateClearanceCache, getFNGGMappings } from './lib/cf';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export async function login(formData) {
  const password = formData.get('password');
  if (await verifyPassword(password)) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await encrypt({ admin: true, expires });
    const cookieStore = await cookies();
    cookieStore.set('admin_session', session, {
      expires,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return { success: true };
  }
  return { success: false, error: 'Invalid password' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
}

export async function applyApprovedCodeLogic(day, code, cookieInfo) {
  try {
    const imagesDir = path.join(process.cwd(), 'uploaded', 'images', `day-${day}`);
    const fragmentPath = path.join(imagesDir, `${code}.webp`);
    const mappingsDir = path.join(process.cwd(), 'uploaded', 'mappings');
    const mappingsPath = path.join(mappingsDir, `day-${day}.json`);
    const mapsDir = path.join(process.cwd(), 'uploaded', 'maps');
    const mapPath = path.join(mapsDir, `day-${day}.png`);

    let shouldSkip = false;
    let currentMap = {};

    try {
      currentMap = JSON.parse(await fs.readFile(mappingsPath, 'utf8'));
    } catch (e) { }

    try {
      await fs.access(fragmentPath);
      if (currentMap[code]) {
        shouldSkip = true;
      }
    } catch (e) { }

    if (shouldSkip) {
      return;
    }

    const url = `https://fortnite.gg/img/fragments/${day}/small/${code}.webp`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Cookie': cookieInfo.cookieString, 'User-Agent': cookieInfo.userAgent }
    });

    let fragmentBuffer;
    if (res.ok) {
      await fs.mkdir(imagesDir, { recursive: true });
      const arrayBuffer = await res.arrayBuffer();
      fragmentBuffer = Buffer.from(arrayBuffer);
      await fs.writeFile(fragmentPath, fragmentBuffer);
    } else {
      console.log(`Failed to download fragment for code ${code}`);
      return;
    }

    let x, y;

    const { postFNGGCode } = await import('./lib/cf.js');
    const postResponse = await postFNGGCode(code);
    if (!postResponse.error && postResponse.x !== undefined && postResponse.y !== undefined) {
      x = postResponse.x;
      y = postResponse.y;
    } else {
      console.error(`Failed to map code ${code} via POST:`, postResponse);
      return;
    }

    currentMap[code] = [x, y];
    await fs.mkdir(mappingsDir, { recursive: true });
    await fs.writeFile(mappingsPath, JSON.stringify(currentMap, null, 2), 'utf8');

    await fs.mkdir(mapsDir, { recursive: true });
    try {
      const mapBuffer = await fs.readFile(mapPath);
      const composited = await sharp(mapBuffer)
        .composite([{ input: fragmentBuffer, left: x * 40, top: y * 40 }])
        .png()
        .toBuffer();
      await fs.writeFile(mapPath, composited);
    } catch (e) {
      const blankMap = await sharp({
        create: { width: 48 * 40, height: 27 * 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
        .composite([{ input: fragmentBuffer, left: x * 40, top: y * 40 }])
        .png()
        .toBuffer();
      await fs.writeFile(mapPath, blankMap);
    }
  } catch (e) {
    console.error('Error applying approved code logic for', code, e);
  }
}

export async function submitCode(formData) {
  const rawCode = formData.get('code');
  const day = parseInt(formData.get('day') || '1');

  if (!rawCode) return { success: false, error: 'Code is required' };

  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return { success: false, error: 'Invalid code format. Use XXXX-XXXX-XXXX' };
  }

  const data = await getData();

  if (data.settings?.lockedDays?.includes(day)) {
    return { success: false, error: 'Submissions are currently locked for this day.' };
  }

  if (data.days[String(day)]?.includes(code)) {
    return { success: false, error: 'Code already published for this day.' };
  }

  if (data.submissions.find(s => s.code === code && s.day === day)) {
    return { success: false, error: 'Code already submitted and pending review.' };
  }

  const cookieStore = await cookies();
  const isAdmin = !!cookieStore.get('admin_session');

  try {
    const { cookieString, userAgent } = await getClearanceCookies();
    const url = `https://fortnite.gg/img/fragments/${day}/small/${code}.webp`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': cookieString,
        'User-Agent': userAgent
      }
    });

    if (res.status === 404) {
      return { success: false, error: 'Invalid code: Does not exist on fortnite.gg.' };
    } else if (res.status === 403 || res.status === 503) {
      console.warn('Cloudflare block during validation, invalidating cache.');
      invalidateClearanceCache();
      return { success: false, error: 'Temporary validation error. Please try again in a moment.' };
    } else if (!res.ok) {
      return { success: false, error: 'Failed to validate fragment.' };
    }

    const willApprove = isAdmin || (data.settings.autoApproval && !data.settings.lockedDays.includes(day));
    let fragmentBuffer = null;

    if (willApprove) {
      const arrayBuffer = await res.arrayBuffer();
      fragmentBuffer = Buffer.from(arrayBuffer);
    }

    const submission = {
      id: randomUUID(),
      code,
      day,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (willApprove) {
      submission.status = 'approved';
      submission.reviewedBy = isAdmin ? 'admin' : 'system';
      submission.reviewedAt = new Date().toISOString();

      if (!data.days[String(day)]) data.days[String(day)] = [];
      data.days[String(day)].push(code);
      data.days[String(day)].sort();

      const mappings = await getFNGGMappings(day);
      await applyApprovedCodeLogic(day, code, { cookieString, userAgent }, mappings);
    }

    data.submissions.unshift(submission);
    await saveData(data);
    return { success: true, autoApproved: submission.status === 'approved' };
  } catch (err) {
    console.error('Validation error:', err);
    return { success: false, error: 'Internal validation error.' };
  }
}

export async function reviewSubmission(id, action) {
  const data = await getData();
  const sub = data.submissions.find(s => s.id === id);
  if (!sub) return { success: false, error: 'Not found' };

  sub.status = action === 'approve' ? 'approved' : 'denied';
  sub.reviewedBy = 'admin';
  sub.reviewedAt = new Date().toISOString();

  if (action === 'approve') {
    const d = String(sub.day);
    if (!data.days[d]) data.days[d] = [];
    if (!data.days[d].includes(sub.code)) {
      data.days[d].push(sub.code);
      data.days[d].sort();

      (async () => {
        try {
          const cookieInfo = await getClearanceCookies();
          const mappings = await getFNGGMappings();
          await applyApprovedCodeLogic(sub.day, sub.code, cookieInfo, mappings);
        } catch (e) { console.error(e); }
      })();
    }
  }

  await saveData(data);
  return { success: true };
}

export async function bulkPublish(formData) {
  const day = formData.get('day');
  const codesRaw = formData.get('codes');

  const codes = codesRaw.split('\n')
    .map(c => c.trim().toUpperCase())
    .filter(c => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c));

  if (!codes.length) return { success: false, error: 'No valid codes found' };

  const data = await getData();
  if (!data.days[day]) data.days[day] = [];

  let added = 0;
  let addedCodes = [];
  for (const c of codes) {
    if (!data.days[day].includes(c)) {
      data.days[day].push(c);
      addedCodes.push(c);
      added++;
    }
  }

  if (added > 0) {
    data.days[day].sort();
    await saveData(data);

    (async () => {
      try {
        const cookieInfo = await getClearanceCookies();
        const mappings = await getFNGGMappings();
        for (const c of addedCodes) {
          await applyApprovedCodeLogic(day, c, cookieInfo, mappings);
        }
      } catch (e) { console.error(e); }
    })();
  } else {
    await saveData(data);
  }

  return { success: true, added };
}

export async function clearDayCodes(day) {
  const data = await getData();
  data.days[String(day)] = [];
  await saveData(data);
  return { success: true };
}

export async function deleteCode(day, code) {
  const data = await getData();
  const d = String(day);
  if (data.days[d]) {
    data.days[d] = data.days[d].filter(c => c !== code);
    await saveData(data);
  }
  return { success: true };
}

export async function manualSync() {
  await syncAllDays();
  return { success: true };
}

export async function toggleSetting(key) {
  const data = await getData();
  data.settings[key] = !data.settings[key];
  await saveData(data);
  return { success: true };
}

export async function toggleLockedDay(day) {
  const data = await getData();
  const d = parseInt(day);
  if (data.settings.lockedDays.includes(d)) {
    data.settings.lockedDays = data.settings.lockedDays.filter(x => x !== d);
  } else {
    data.settings.lockedDays.push(d);
  }
  await saveData(data);
  return { success: true };
}

export async function uploadMap(formData) {
  try {
    const day = formData.get('day');
    const file = formData.get('file');

    if (!file || file.size === 0) {
      return { success: false, error: 'No file provided' };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const mapsDir = path.join(process.cwd(), 'uploaded', 'maps');
    await fs.mkdir(mapsDir, { recursive: true });

    const ext = path.extname(file.name) || '.png';
    const filename = `day-${day}${ext}`;
    const filepath = path.join(mapsDir, filename);

    await fs.writeFile(filepath, buffer);

    return { success: true, url: `/api/maps/${filename}?t=${Date.now()}` };
  } catch (err) {
    console.error('Upload map error:', err);
    return { success: false, error: err.message || String(err) };
  }
}
