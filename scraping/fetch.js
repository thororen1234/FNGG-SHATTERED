const fs = require('fs');
const path = require('path');
const https = require('https');

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

async function fetchCodes(day) {
    return new Promise((resolve, reject) => {
        https.get(`https://fnshattered.thororen.com/api/raw?day=${day}`, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch codes. Status code: ${res.statusCode}`));
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function main() {
    console.log(`Fetching codes for day ${targetDay} from API...`);

    let rawData;
    try {
        rawData = await fetchCodes(targetDay);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    const codes = rawData.split('\n')
        .map(l => l.trim().toUpperCase())
        .filter(c => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c));

    if (codes.length === 0) {
        console.log(`No valid codes found for day ${targetDay}.`);
        process.exit(0);
    }

    const outputDir = path.join(__dirname, '..', 'web', 'public', 'images');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const dayDir = path.join(outputDir, `day-${targetDay}`);
    if (!fs.existsSync(dayDir)) {
        fs.mkdirSync(dayDir, { recursive: true });
    }

    console.log(`\nStarting downloads for day ${targetDay} (${codes.length} images)...`);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const code of codes) {
        const url = `https://fortnite.gg/img/fragments/${targetDay}/small/${code}.webp`;
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
