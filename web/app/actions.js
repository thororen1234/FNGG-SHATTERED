'use server';

import { cookies } from 'next/headers';
import { encrypt, verifyPassword } from './lib/auth';
import { getData, saveData } from './lib/data';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export async function login(formData) {
  const password = formData.get('password');
  if (await verifyPassword(password)) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
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

export async function submitCode(formData) {
  const rawCode = formData.get('code');
  const day = parseInt(formData.get('day') || '1');

  if (!rawCode) return { success: false, error: 'Code is required' };

  // Basic normalization
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return { success: false, error: 'Invalid code format. Use XXXX-XXXX-XXXX' };
  }

  const data = await getData();

  // Check if already published
  if (data.days[String(day)]?.includes(code)) {
    return { success: false, error: 'Code already published for this day.' };
  }

  // Check if duplicate submission
  if (data.submissions.find(s => s.code === code && s.day === day)) {
    return { success: false, error: 'Code already submitted and pending review.' };
  }

  const submission = {
    id: randomUUID(),
    code,
    day,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  // Auto approve check
  if (data.settings.autoApproval && !data.settings.lockedDays.includes(day)) {
    submission.status = 'approved';
    submission.reviewedBy = 'system';
    submission.reviewedAt = new Date().toISOString();

    if (!data.days[String(day)]) data.days[String(day)] = [];
    data.days[String(day)].unshift(code);
  }

  data.submissions.unshift(submission);
  await saveData(data);
  return { success: true, autoApproved: submission.status === 'approved' };
}

export async function reviewSubmission(id, action) {
  // requires admin session check here or in the component calling it
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
      data.days[d].unshift(sub.code);
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
  for (const c of codes) {
    if (!data.days[day].includes(c)) {
      data.days[day].unshift(c);
      added++;
    }
  }

  await saveData(data);
  return { success: true, added };
}

export async function clearDayCodes(day) {
  const data = await getData();
  data.days[String(day)] = [];
  await saveData(data);
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
