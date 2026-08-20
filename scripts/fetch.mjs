import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDay = process.argv[2];

if (!targetDay) {
    console.error('Please specify a day.');
    process.exit(1);
}

async function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            } else {
                file.close();
                fs.unlink(dest, () => { });
                reject(new Error(`Status Code: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

function readCodes(day) {
    const jsonPath = path.join(__dirname, '..', 'web', 'uploaded', 'mappings', 'br/7/4', `${day}.json`);

    if (!fs.existsSync(jsonPath)) {
        throw new Error(`File not found: ${jsonPath}`);
    }

    const raw = fs.readFileSync(jsonPath, 'utf-8');
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Invalid JSON in ${jsonPath}: ${err.message}`);
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error(`Expected a JSON object of codes in ${jsonPath}`);
    }

    const codes = Object.keys(parsed)
        .map(k => k.trim().toUpperCase())
        .filter(k => /^[A-F0-9]{12}$/.test(k));

    return codes;
}

async function main() {
    console.log(`Reading codes for day ${targetDay} from local JSON...`);

    let codes;
    try {
        codes = readCodes(targetDay);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    if (codes.length === 0) {
        console.log(`No valid codes found for day ${targetDay}.`);
        process.exit(0);
    }

    const outputDir = path.join(__dirname, '..', 'web', 'uploaded', 'images', 'br/7/4');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const dayDir = path.join(outputDir, `${targetDay}`);
    if (!fs.existsSync(dayDir)) {
        fs.mkdirSync(dayDir, { recursive: true });
    }

    console.log(`\nStarting downloads for day ${targetDay} (${codes.length} images)...`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const code of codes) {
        const url = `https://fortnite.gg/img/x/override-puzzle/${targetDay}/${code}.webp`;
        const dest = path.join(dayDir, `${code}.webp`);

        if (fs.existsSync(dest)) {
            skipCount++;
            continue;
        }

        try {
            await downloadImage(url, dest);
            successCount++;
        } catch (err) {
            console.error(`Failed to download ${code}.webp: ${err.message}`);
            failCount++;
        }

        await new Promise(r => setTimeout(r, 50));
    }

    console.log(`\nDay ${targetDay} complete. Downloaded: ${successCount}, Skipped: ${skipCount}, Failed: ${failCount}`);

    process.exit(0);
}

main().catch(console.error);
