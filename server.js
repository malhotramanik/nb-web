const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;

const DEFAULT_SEARCH_PARAM = 'W3sibGF0IjoxMi45MTEzOTUsImxvbiI6NzcuNjc2Mjk5MSwicGxhY2VJZCI6IkNoSUpuU0RJMDJ3VHJqc1JzMHhqeEktem5LcyIsInBsYWNlTmFtZSI6IlBMYVkgQXJlbmEiLCJzaG93TWFwIjpmYWxzZX0seyJsYXQiOjEyLjg5OTEyNzgsImxvbiI6NzcuNjU4OTAzMiwicGxhY2VJZCI6IkNoSUo5NFpkTmdBVHJqc1JiaGhVSE5kQXNUcyIsInBsYWNlTmFtZSI6Ikhhcmx1ciBSb2FkIiwic2hvd01hcCI6ZmFsc2V9XQ==';

function buildApiUrl(searchParam) {
    const param = encodeURIComponent(searchParam || DEFAULT_SEARCH_PARAM);
    return `https://www.nobroker.in/api/v3/multi/property/RENT/filter?budgetRange=0%2C500000&city=bangalore&isMetro=false&locality=PLaY+Arena%2CHarlur+Road&orderBy=lastUpdateDate%2Cdesc&radius=2.5&rent=30000%2C55000&searchParam=${param}&sharedAccomodation=0&type=BHK2%2CBHK3`;
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
};

function fetchPage(pageNo, searchParam) {
    return new Promise((resolve, reject) => {
        const apiUrl = `${buildApiUrl(searchParam)}&pageNo=${pageNo}`;
        https.get(apiUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function handleApiRefresh(res, searchParam) {
    try {
        const allData = [];
        const seenIds = new Set();

        for (let page = 1; page <= 3; page++) {
            const data = await fetchPage(page, searchParam);
            if (data.data && data.data.length > 0) {
                for (const prop of data.data) {
                    const propId = prop.id || prop.propertyId;
                    if (propId && !seenIds.has(propId)) {
                        seenIds.add(propId);
                        allData.push(prop);
                    }
                }
            }
        }

        const result = { data: allData };

        // Also save to output.json
        fs.writeFileSync(path.join(__dirname, 'output.json'), JSON.stringify(result));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        console.log(`Refreshed: ${allData.length} unique properties`);
    } catch (error) {
        console.error('Error fetching from API:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to fetch from NoBroker API' }));
    }
}

function serveStaticFile(filePath, res) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

const KEYWORDS_FILE = path.join(__dirname, 'keywords.json');

function getKeywords() {
    try {
        const data = fs.readFileSync(KEYWORDS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { propertyTitleKeywords: [] };
    }
}

function saveKeywords(keywords) {
    fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(keywords, null, 2));
}

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/api/refresh') {
        const searchParam = parsedUrl.query.searchParam || null;
        handleApiRefresh(res, searchParam);
        return;
    }

    if (parsedUrl.pathname === '/api/keywords' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getKeywords()));
        return;
    }

    if (parsedUrl.pathname === '/api/keywords' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                saveKeywords(data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop');
});
