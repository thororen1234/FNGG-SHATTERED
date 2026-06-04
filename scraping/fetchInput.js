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
            console.log(`[SKIP] ${id} already exists in day-${day}`);
            return true;
        }

        const url = `https://fortnite.gg/img/fragments/${day}/small/${id}.webp`;
        try {
            if (!fs.existsSync(dayDir)) {
                fs.mkdirSync(dayDir, { recursive: true });
            }
            await downloadImage(url, dest);
            console.log(`[OK] ${id} -> day-${day}`);
            return true;
        } catch { }

        await new Promise(r => setTimeout(r, 50));
    }

    console.log(`[MISS] ${id} not found on any day`);
    return false;
}

async function main() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`input.txt not found at ${INPUT_FILE}`);
        process.exit(1);
    }

    const ids = fs.readFileSync(INPUT_FILE, 'utf8')
        .split('\n')
        .map(l => l.trim().toUpperCase())
        .filter(l => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(l));

    if (ids.length === 0) {
        console.log('No valid IDs found in input.txt.');
        process.exit(0);
    }

    console.log(`Checking ${ids.length} IDs from input.txt across days ${DAYS.join(', ')}...\n`);

    let found = 0;
    let missed = 0;

    for (const id of ids) {
        const ok = await tryFetchForId(id);
        ok ? found++ : missed++;
    }

    console.log(`\nDone. Found: ${found}, Not found: ${missed}`);

    process.exit(0)
}

main().catch(console.error);
