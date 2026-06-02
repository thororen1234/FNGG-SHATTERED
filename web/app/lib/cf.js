import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

let activeBrowser = null;
let activePage = null;
let cachedCookies = null;
let cookieTimestamp = 0;
let isInitializing = false;
let initPromise = null;

async function initBrowser() {
    if (activeBrowser && activePage) {
        if (Date.now() - cookieTimestamp < 2 * 60 * 60 * 1000) {
            return;
        }
    }

    if (isInitializing && initPromise) {
        return initPromise;
    }

    isInitializing = true;
    initPromise = (async () => {
        try {
            console.log('Launching persistent Puppeteer instance for Cloudflare...');
            if (activeBrowser) await activeBrowser.close().catch(() => { });

            activeBrowser = await puppeteer.launch({
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            });

            activePage = await activeBrowser.newPage();

            if (process.env.SHATTERED_LOGIN) {
                await activePage.setCookie({
                    name: 'shattered_login',
                    value: process.env.SHATTERED_LOGIN,
                    domain: '.fortnite.gg',
                    path: '/'
                });
                console.log('Injected shattered_login cookie.');
            }

            await activePage.goto('https://fortnite.gg/shattered', { waitUntil: 'networkidle2', timeout: 45000 });
            await new Promise(r => setTimeout(r, 5000));

            const cookies = await activePage.cookies();
            const cfClearance = cookies.find(c => c.name === 'cf_clearance');

            if (cfClearance) {
                const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
                const userAgent = await activeBrowser.userAgent();
                cachedCookies = { cookieString, userAgent };
                cookieTimestamp = Date.now();
                console.log('Successfully bypassed CF and established persistent session.');
            } else {
                throw new Error('cf_clearance cookie not found after waiting.');
            }
        } catch (error) {
            console.error('Error initializing persistent browser:', error);
            if (activeBrowser) {
                await activeBrowser.close().catch(() => { });
                activeBrowser = null;
                activePage = null;
            }
            throw error;
        } finally {
            isInitializing = false;
            initPromise = null;
        }
    })();

    return initPromise;
}

export async function getClearanceCookies() {
    await initBrowser();
    return cachedCookies;
}

export function invalidateClearanceCache() {
    cachedCookies = null;
    cookieTimestamp = 0;
    if (activeBrowser) {
        activeBrowser.close().catch(() => { });
        activeBrowser = null;
        activePage = null;
    }
}

export async function getFNGGMappings() {
    try {
        await initBrowser();
        console.log(`Scraping coordinates from persistent browser...`);

        await activePage.goto(`https://fortnite.gg/shattered`, { waitUntil: 'networkidle2', timeout: 45000 });

        await activePage.waitForSelector('button[data-tab="board"]', { timeout: 45000 });
        await activePage.click('button[data-tab="board"]');

        await activePage.waitForSelector('#shattered-board-grid', { timeout: 45000 });

        const mappings = await activePage.evaluate(() => {
            const grid = document.querySelector('#shattered-board-grid');
            if (!grid) return {};

            const cols = Number(grid.dataset.cols) || 48;
            const cells = grid.querySelectorAll('.shattered-board-cell');
            const result = {};

            cells.forEach((cell, i) => {
                const bg = cell.style.backgroundImage || window.getComputedStyle(cell).backgroundImage;
                const match = bg.match(/([A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4})\.webp/i);
                if (match) {
                    const code = match[1].toUpperCase();
                    const x = i % cols;
                    const y = Math.floor(i / cols);
                    result[code] = [x, y];
                }
            });
            return result;
        });

        console.log(`Successfully scraped ${Object.keys(mappings).length} known mappings from FNGG.`);
        return mappings;
    } catch (error) {
        console.error('Error scraping FNGG mappings:', error);
        return {};
    }
}

export async function postFNGGCode(code) {
    try {
        await initBrowser();
        console.log(`Submitting code ${code} to FNGG via DOM...`);

        await activePage.goto(`https://fortnite.gg/shattered`, { waitUntil: 'networkidle2', timeout: 45000 });
        await activePage.waitForSelector('button[data-tab="board"]', { timeout: 45000 });
        await activePage.click('button[data-tab="board"]');
        await activePage.waitForSelector('#shattered-board-grid', { timeout: 45000 });

        const result = await activePage.evaluate(async (fragmentCode) => {
            const input = document.getElementById("shattered-board-input");
            const form = document.getElementById("shattered-board-form");

            if (!input || !form) return { error: true, message: 'Form not found' };

            input.value = fragmentCode;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
            await new Promise(r => setTimeout(r, 500));

            const grid = document.querySelector('#shattered-board-grid');
            if (!grid) return { error: true, message: 'Grid not found' };

            const cols = Number(grid.dataset.cols) || 48;
            const cells = grid.querySelectorAll('.shattered-board-cell');

            let foundX = -1, foundY = -1;

            for (let i = 0; i < cells.length; i++) {
                const cell = cells[i];
                const bg = cell.style.backgroundImage || window.getComputedStyle(cell).backgroundImage;
                if (bg && bg.toUpperCase().includes(fragmentCode.toUpperCase())) {
                    foundX = i % cols;
                    foundY = Math.floor(i / cols);
                    break;
                }
            }

            if (foundX !== -1) {
                return { error: false, x: foundX, y: foundY };
            } else {
                return { error: true, message: 'Code not found on grid after submission' };
            }
        }, code);

        console.log(`POST response for ${code}:`, result);
        return result;
    } catch (error) {
        console.error(`Error POSTing code ${code}:`, error);
        return { error: true, message: error.message };
    }
}
