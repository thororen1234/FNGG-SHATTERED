import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DAYS = [1, 2, 3, 4, 5, 6];
const INPUT_FILE = path.join(__dirname, 'input.txt');
const OUTPUT_BASE = path.join(__dirname, '..', 'web', 'uploaded', 'images');

function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => file.close(resolve));
            } else {
                file.close();
                fs.unlink(dest, () => { });
                reject(new Error(`Status ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function tryFetchForId(id) {
    for (const day of DAYS) {
        const dayDir = path.join(OUTPUT_BASE, `day-${day}`);
        const dest = path.join(dayDir, `${id}.webp`);

        if (fs.existsSync(dest)) {
            return "skipped";
        }

        const url = `https://fortnite.gg/img/fragments/${day}/small/${id}.webp`;
        try {
            if (!fs.existsSync(dayDir)) {
                fs.mkdirSync(dayDir, { recursive: true });
            }
            await downloadImage(url, dest);
            console.log(`[OK] ${id} -> day-${day}`);
            return "found";
        } catch { }

        await new Promise(r => setTimeout(r, 50));
    }

    console.log(`[MISS] ${id} not found on any day`);
    return "missing";
}

async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`input.txt not found at ${INPUT_FILE}`);
        process.exit(1);
    }

    const raw = fs.readFileSync(INPUT_FILE, 'utf8');
    const ids = [...new Set(
        (raw.match(/\b[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}\b/g) || [])
            .map(id => id.toUpperCase())
    )];

    if (ids.length === 0) {
        console.log('No valid IDs found in input.txt.');
        process.exit(0);
    }

    console.log(`Checking ${ids.length} IDs from input.txt across days ${DAYS.join(', ')}...\n`);

    let found = 0;
    let missed = 0;
    let skipped = 0;

    for (const id of ids) {
        const ok = await tryFetchForId(id);
        switch (ok) {
            case "found":
                found++;
                break;
            case "missing":
                missed++;
                break;
            case "skipped":
                skipped++;
                break;
        }
    }

    console.log(`\nDone. Found: ${found}, Not found: ${missed}, Skipped: ${skipped}`);

    process.exit(0)
}

main().catch(console.error);
