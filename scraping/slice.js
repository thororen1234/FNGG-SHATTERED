import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const targetDay = process.argv[2];

if (!targetDay) {
  console.error('Please specify a day.');
  process.exit(1);
}

const mapPath = path.join('../web/uploaded/maps', `day-${targetDay}.png`);
const mappingsPath = path.join('../web/public/mappings', `day-${targetDay}.json`);
const outDir = path.join('../web/public/images', `day-${targetDay}`);

if (!fs.existsSync(mapPath)) {
  console.error(`Map for day ${targetDay} not found at ${mapPath}`);
  process.exit(1);
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
const COLS = 48;
const ROWS = 27;

async function slice() {
  const metadata = await sharp(mapPath).metadata();
  const width = metadata.width;
  const height = metadata.height;

  const cellWidth = width / COLS;
  const cellHeight = height / ROWS;

  console.log(`Image size: ${width}x${height}, Cell size: ${cellWidth}x${cellHeight}`);

  const cellToCode = {};
  for (const [code, coords] of Object.entries(mappings)) {
    cellToCode[`${coords[0]},${coords[1]}`] = code;
  }

  let processedCount = 0;
  let missingIndex = 1;
  let hasChanges = false;
  let missingCount = 0;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let code = cellToCode[`${c},${r}`];

      const left = Math.round(c * cellWidth);
      const top = Math.round(r * cellHeight);
      let extractWidth = Math.round((c + 1) * cellWidth) - left;
      let extractHeight = Math.round((r + 1) * cellHeight) - top;

      if (!code) {
        code = `missing-${missingIndex}`;
        mappings[code] = [c, r];
        hasChanges = true;
        console.log(`Fragment missing at ${c}, ${r} - saving as ${code}.webp`);
        missingIndex++;
        missingCount++;
      }

      let filename = `${code}.webp`;
      const outPath = path.join(outDir, filename);

      if (!fs.existsSync(outPath)) {
        await sharp(mapPath)
          .extract({ left, top, width: extractWidth, height: extractHeight })
          .webp({ quality: 90 })
          .toFile(outPath);
      }

      processedCount++;
      if (processedCount % 100 === 0) console.log(`Processed ${processedCount} fragments...`);
    }
  }

  if (hasChanges) {
    fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 4), 'utf8');
    console.log(`Updated mappings saved to ${mappingsPath}`);
  }

  console.log(`Done! Processed ${processedCount} total fragments. (${missingCount} were missing/unknown codes)`);

  process.exit(0);
}

slice().catch(console.error);
