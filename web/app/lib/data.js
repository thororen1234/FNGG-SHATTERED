import fs from 'fs/promises';
import path from 'path';

const MAPPINGS_DIR = path.join(process.cwd(), 'uploaded', 'mappings');

const defaultEventData = {
  days: { "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] },
  lateFound: { "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] },
  updatedAt: new Date().toISOString()
};

export async function getEventData(mode, chapter, season) {
  const parts = [mode];
  if (chapter) parts.push(chapter);
  if (season) parts.push(season);

  const eventDir = path.join(MAPPINGS_DIR, ...parts);
  const indexFile = path.join(eventDir, 'index.json');

  try {
    const content = await fs.readFile(indexFile, 'utf-8');
    const parsed = JSON.parse(content);

    // Ensure default structure exists
    if (!parsed.days) parsed.days = { ...defaultEventData.days };
    if (!parsed.lateFound) parsed.lateFound = { ...defaultEventData.lateFound };

    return parsed;
  } catch (err) {
    console.error(`Failed to read index.json for ${parts.join('/')}, returning default data:`, err);
    return { ...defaultEventData, updatedAt: new Date().toISOString() };
  }
}

export async function saveEventData(mode, chapter, season, data) {
  const parts = [mode];
  if (chapter) parts.push(chapter);
  if (season) parts.push(season);

  const indexFile = path.join(MAPPINGS_DIR, ...parts, 'index.json');
  data.updatedAt = new Date().toISOString();
  await fs.writeFile(indexFile, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getAllEvents() {
  const events = [];
  try {
    const modes = await fs.readdir(MAPPINGS_DIR, { withFileTypes: true });
    for (const mode of modes) {
      if (!mode.isDirectory()) continue;
      const chapters = await fs.readdir(path.join(MAPPINGS_DIR, mode.name), { withFileTypes: true });

      for (const chapter of chapters) {
        if (!chapter.isDirectory()) continue;

        const chapterPath = path.join(MAPPINGS_DIR, mode.name, chapter.name);
        const seasonsOrFiles = await fs.readdir(chapterPath, { withFileTypes: true });

        let hasSeason = false;
        for (const item of seasonsOrFiles) {
          if (item.isDirectory()) {
            hasSeason = true;
            try {
              const indexFile = path.join(chapterPath, item.name, 'index.json');
              const indexContent = await fs.readFile(indexFile, 'utf-8');
              const indexData = JSON.parse(indexContent);
              events.push({
                mode: mode.name,
                chapter: chapter.name,
                season: item.name,
                name: indexData.name || `${mode.name} Chapter ${chapter.name} Season ${item.name}`,
                ongoing: indexData.ongoing
              });
            } catch (e) { }
          }
        }

        if (!hasSeason) {
          try {
            const indexFile = path.join(chapterPath, 'index.json');
            const indexContent = await fs.readFile(indexFile, 'utf-8');
            const indexData = JSON.parse(indexContent);
            events.push({
              mode: mode.name,
              chapter: chapter.name,
              name: indexData.name || `${mode.name} Season ${chapter.name}`,
              ongoing: indexData.ongoing
            });
          } catch (e) { }
        }
      }
    }
  } catch (err) {
    console.error('Failed to get events:', err);
  }
  return events;
}
