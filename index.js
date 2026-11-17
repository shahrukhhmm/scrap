const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Authenticate the user and get session cookies
async function authenticateUser() {
    const apiUrl = "https://seekingalpha.com/api/v3/login_tokens";

    const payload = {
        data: {
            type: "loginTokens",
            relationships: {
                user: {
                    data: {
                        email: "ithk.invest.4526@gmail.com",
                        password: "4526ithk6254",
                    },
                },
            },
        },
    };

    const headers = {
        accept: "/",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "content-length": JSON.stringify(payload).length,
        "content-type": "application/json",
        origin: "https://seekingalpha.com",
        priority: "u=1, i",
        referer: "https://seekingalpha.com/article/4702617-enovix-powers-up-with-new-deal-buy-this-stock",
        "sec-ch-ua": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        cookie: "machine_cookie=7178364497884; _sasource=; _gcl_au=1.1.1144937494.1724339770; ...", // Add your complete cookie string
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    };

    try {
        const response = await axios.post(apiUrl, payload, { headers });
        const cookies = response.headers["set-cookie"];
        return { data: response.data, cookies };
    } catch (error) {
        throw error.response ? error.response.data : error.message;
    }
}

// Scraping function using Puppeteer
async function scrapeSeekingAlpha(url, cookies) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Set cookies in Puppeteer
        await page.setCookie(...cookies.map(cookie => {
            const [name, value] = cookie.split(';')[0].split('=');
            return { name, value, domain: 'seekingalpha.com' };
        }));

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

        // Simulate a delay (5 seconds)
        await new Promise(r => setTimeout(r, 9000));

        // Simulate scrolling to trigger lazy loading, if necessary
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });

        // Wait for the selector with an increased timeout
        await page.waitForSelector('div[data-test-id="key-value-list"]', { timeout: 90000 });

        const textContent = await page.evaluate(() => {
            const element = document.querySelector('div[data-test-id="key-value-list"]');
            return element ? element.innerText.trim() : null;
        });

        return textContent;

    } catch (error) {
        console.error('Error scraping the website:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// API route
app.get('/scrape', async(req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing URL parameter' });
    }

    try {
        const { cookies } = await authenticateUser();
        const content = await scrapeSeekingAlpha(url, cookies);
        res.json({ content });
    } catch (error) {
        res.status(500).json({ error: 'Failed to scrape the website' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});