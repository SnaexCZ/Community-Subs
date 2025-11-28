const { addonBuilder } = require("stremio-addon-sdk");
const { getRouter } = require("stremio-addon-sdk");
const puppeteer = require("puppeteer");
const axios = require("axios");
const iconv = require("iconv-lite");
const http = require("http");
const crypto = require("crypto");

// ==========================================
// 🍪 KONFIGURACE 🍪
// ==========================================
let MOJE_COOKIES = [];
let IS_CONFIGURED = false;

try {
    if (process.env.COOKIES_JSON) {
        MOJE_COOKIES = JSON.parse(process.env.COOKIES_JSON);
        IS_CONFIGURED = true;
        console.log("✅ Cookies načteny. Režim: FUNKČNÍ DOPLNĚK.");
    } else {
        console.log("ℹ️ Žádné cookies. Režim: VEŘEJNÁ ŠABLONA.");
    }
} catch (e) {
    console.error("❌ Chyba JSON cookies:", e.message);
}

const builder = new addonBuilder({
    id: "community.subs.czsk",
    version: "3.1.1", // Verze: Detektor Mojibake (Bez bodování)
    name: "Community Subs", 
    description: "CZ/SK titulky pro seriály a anime. Vyžaduje vlastní instanci.",
    resources: ["subtitles"],
    types: ["series", "anime"],
    catalogs: []
});

const subtitlesCache = new Map();

// Čištění cache
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of subtitlesCache.entries()) {
        if (now - data.timestamp > 3600 * 1000) subtitlesCache.delete(id);
    }
}, 3600 * 1000);

// --- HTML ŠABLONY ---
const publicTemplate = (spaceId) => `
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Community Subs - Šablona</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f0f0f; color: #eee; display: flex; flex-direction: column; align-items: center; padding: 20px; margin: 0; }
        .container { max-width: 800px; width: 100%; background: #1e1e1e; padding: 40px; border-radius: 12px; }
        h1 { color: #a29bfe; text-align: center; }
        .btn-clone { background: linear-gradient(45deg, #6c5ce7, #a29bfe); color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; display: block; width: fit-content; margin: 20px auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Community Subs (CZ/SK)</h1>
        <p style="text-align:center">Veřejná šablona. Pro funkčnost si vytvořte kopii.</p>
        <a href="https://huggingface.co/spaces/${spaceId}?duplicate=true" target="_blank" class="btn-clone">🚀 NAKLONOVAT SPACE</a>
    </div>
</body>
</html>
`;

const privateTemplate = (manifestUrl) => `
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Community Subs</title>
    <style>
        body { font-family: sans-serif; background: #050505; color: #eee; text-align: center; padding: 50px; }
        .btn { background: #6c5ce7; color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.2rem; }
        .code { background: #222; padding: 15px; margin-top: 30px; border-radius: 8px; font-family: monospace; color: #aaa; display: inline-block; }
    </style>
</head>
<body>
    <h1>Community Subs</h1>
    <p style="color: #00b894;">✅ Připraveno</p>
    <br>
    <a href="stremio://${manifestUrl}" class="btn">INSTALOVAT</a>
    <br><br>
    <div class="code">https://${manifestUrl}</div>
</body>
</html>
`;

// --- POMOCNÉ FUNKCE ---
async function getMetaZId(type, id) {
    const cisteId = id.split(":")[0]; 
    try {
        if (id.startsWith("kitsu")) {
            const kitsuId = id.split(":")[1]; 
            const response = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}`);
            const attr = response.data.data.attributes;
            const titles = attr.titles || {};
            const enTitle = titles.en || titles.en_jp || attr.canonicalTitle;
            const jpTitle = titles.en_jp || attr.canonicalTitle; 
            const year = attr.startDate ? attr.startDate.substring(0, 4) : "";
            return { name: enTitle, altName: jpTitle !== enTitle ? jpTitle : null, year: year };
        } else {
            const response = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${cisteId}.json`);
            const meta = response.data.meta;
            let year = meta.year || "";
            if (year && year.includes("–")) year = year.split("–")[0];
            return { name: meta.name, altName: null, year: year };
        }
    } catch (error) { return null; }
}

async function ziskatAliasyZKitsu(nazev) {
    try {
        const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(nazev)}`;
        const response = await axios.get(url);
        if (response.data.data && response.data.data.length > 0) {
            const attr = response.data.data[0].attributes;
            const titles = attr.titles || {};
            const mozneNazvy = [titles.en, titles.en_jp, titles.ja_jp, attr.canonicalTitle].filter(Boolean);
            return [...new Set(mozneNazvy)];
        }
    } catch (e) {}
    return [];
}

function vytvorSlug(text) {
    if (!text) return "";
    return text.toLowerCase().replace(/[:!?,.]/g, "").replace(/'/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}
function formatujCislo(cislo) { return cislo.toString().padStart(2, "0"); }

function analyzovatNazev(nazev, originalniSerie) {
    let cistyNazev = nazev;
    let novaSerie = originalniSerie;
    const seasonRegex = /(?:\s+|^)(?:Season|Part|Cour)\s*(\d+|I+)|(\d+)(?:nd|rd|th)\s*Season/i;
    const match = nazev.match(seasonRegex);
    if (match) {
        let detectedSeason = match[1] || match[2];
        if (detectedSeason === 'II') detectedSeason = 2;
        if (detectedSeason === 'III') detectedSeason = 3;
        if (detectedSeason === 'IV') detectedSeason = 4;
        if (detectedSeason && !isNaN(detectedSeason)) {
            novaSerie = parseInt(detectedSeason);
            cistyNazev = nazev.replace(seasonRegex, "").trim().replace(/[: -]+$/, "");
        }
    }
    return { cistyNazev, novaSerie };
}

// 🚑 NOVÁ LOGIKA OPRAVY: Detekce rozbití
// Neopravujeme naslepo. Hledáme konkrétní sekvence "dvojitého kódování".
function jeTextRozbity(text) {
    // Hledáme znaky typické pro UTF-8 interpretované jako Latin1/Windows-1252
    // Ã¡ (á), Ã½ (ý), Å¾ (ž), Ä› (ě), Ä (č), Å™ (ř)
    const vzorky = ["Ã¡", "Ã½", "Å¾", "Ä›", "Ä", "Å™", "Å¡", "Ã­", "Ã©"];
    let pocetNalezu = 0;
    for (const vzorek of vzorky) {
        if (text.includes(vzorek)) pocetNalezu++;
    }
    // Pokud najdeme alespoň 2 různé typy poškození, považujeme text za rozbitý
    return pocetNalezu >= 1;
}

function opravitMojibake(text) {
    return text
        .replace(/Ã¡/g, "á").replace(/Ã/g, "Á")
        .replace(/Ã©/g, "é").replace(/Ã‰/g, "É")
        .replace(/Ä›/g, "ě").replace(/Äš/g, "Ě")
        .replace(/Ã­/g, "í").replace(/Ã/g, "Í")
        .replace(/Ã³/g, "ó").replace(/Ã“/g, "Ó")
        .replace(/Ãº/g, "ú").replace(/Ãš/g, "Ú")
        .replace(/Å¯/g, "ů").replace(/Å®/g, "Ů")
        .replace(/Ã½/g, "ý").replace(/Ã/g, "Ý")
        .replace(/Å¾/g, "ž").replace(/Å½/g, "Ž")
        .replace(/Å¡/g, "š").replace(/Å /g, "Š")
        .replace(/Ä/g, "č").replace(/ÄŒ/g, "Č")
        .replace(/Å™/g, "ř").replace(/Å˜/g, "Ř")
        .replace(/Ä/g, "ď").replace(/ÄŽ/g, "Ď")
        .replace(/Å¥/g, "ť").replace(/Å¤/g, "Ť")
        .replace(/Åˆ/g, "ň").replace(/Å‡/g, "Ň");
}

// --- HLAVNÍ HANDLER ---
if (IS_CONFIGURED) {
    builder.defineSubtitlesHandler(async ({ type, id }) => {
        const meta = await getMetaZId(type, id);
        if (!meta) return Promise.resolve({ subtitles: [] });

        const castiId = id.split(":");
        let serie = 1; let epizoda = 1;
        if (id.startsWith("kitsu") && castiId.length >= 3) epizoda = castiId[2];
        else if (castiId.length >= 3) { serie = castiId[1]; epizoda = castiId[2]; }

        let vsechnyNazvy = [meta.name];
        if (meta.altName) vsechnyNazvy.push(meta.altName);
        if (type === "anime" || type === "series") {
            const aliasy = await ziskatAliasyZKitsu(meta.name);
            vsechnyNazvy = [...vsechnyNazvy, ...aliasy];
        }
        vsechnyNazvy = [...new Set(vsechnyNazvy)];

        const slugsToTry = [];
        for (const nazev of vsechnyNazvy) {
            const { cistyNazev, novaSerie } = analyzovatNazev(nazev, serie);
            const aktualniSerie = (novaSerie !== serie) ? novaSerie : serie;
            const slug = vytvorSlug(cistyNazev);
            if (!slug) continue;
            slugsToTry.push({ slug: slug, serie: aktualniSerie });
            if (meta.year) slugsToTry.push({ slug: vytvorSlug(`${cistyNazev} ${meta.year}`), serie: aktualniSerie });
        }
        const finalSlugs = [...new Map(slugsToTry.map(item => [item.slug + item.serie, item])).values()];

        const browser = await puppeteer.launch({ 
            headless: "new", 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled', '--window-size=1920,1080']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        try { await page.setCookie(...MOJE_COOKIES); } catch (e) {}

        let finalniTitulky = [];
        const port = 7860;
        const spaceHost = process.env.SPACE_HOST || `localhost:${port}`;
        const publicUrl = `https://${spaceHost}`;

        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('.vtt') || url.includes('.srt') || (url.includes('sub') && url.includes('.xml'))) {
                if (response.status() !== 200) return;
                let jazyk = "eng"; 
                if (url.includes("cz") || url.includes("sk") || url.includes("cze")) jazyk = "cze";

                const uzMame = finalniTitulky.some(t => t.id === url);
                if (!uzMame) {
                    console.log(`⚡ ZACHYCENO (${jazyk}): ${url}`);
                    try {
                        const buffer = await response.buffer();
                        
                        // 1. VŽDY BEREME UTF-8 JAKO ZÁKLAD
                        let text = iconv.decode(buffer, 'utf8');
                        let metoda = "UTF-8";

                        // 2. KONTROLA KVALITY (Hledáme Mojibake)
                        if (jeTextRozbity(text)) {
                            console.log(`   🚑 Detekováno poškození (Mojibake). Opravuji...`);
                            text = opravitMojibake(text);
                            metoda = "OPRAVENO";
                        }

                        // 3. ČIŠTĚNÍ
                        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
                        text = text.replace(/<[^>]*>/g, ""); 
                        text = text.replace(/^[\s\S]*?WEBVTT/i, "WEBVTT");
                        if (!text.startsWith("WEBVTT")) text = "WEBVTT\n\n" + text;
                        text = text.replace(/^WEBVTT\s*/i, "WEBVTT\n\n");
                        text = text.replace(/\r\n/g, "\n");

                        if (text.trim().startsWith("<") || text.includes("<body")) return;

                        const subId = crypto.randomBytes(8).toString("hex");
                        subtitlesCache.set(subId, { content: text, timestamp: Date.now() });
                        const proxyUrl = `${publicUrl}/sub/${subId}.vtt`;

                        finalniTitulky.push({ id: subId, url: proxyUrl, lang: jazyk });
                        console.log(`   ✅ Uloženo (${metoda}).`);
                    } catch (err) { }
                }
            }
        });

        try {
            for (const item of finalSlugs) {
                const pathSuffix = `/s${formatujCislo(item.serie)}e${formatujCislo(epizoda)}`;
                const url = `https://svetserialu.io/serial/${item.slug}${pathSuffix}`;
                console.log(`🔎 Zkouším: ${url}`);
                try {
                    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
                    const currentUrl = page.url().replace(/\/$/, ""); 
                    if (currentUrl === "https://svetserialu.io") continue;
                    
                    let clicked = false;
                    const iframe = await page.$('iframe[src*="video"], iframe[src*="embed"]');
                    if (iframe) {
                        const box = await iframe.boundingBox();
                        if (box) await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
                        clicked = true;
                    }
                    if (!clicked) {
                        const playBtn = await page.$('.play, .fa-play');
                        if (playBtn) await playBtn.click();
                        else await page.mouse.click(960, 540);
                    }
                    await new Promise(r => setTimeout(r, 8000));
                    if (finalniTitulky.length > 0) break;
                } catch (err) {}
            }
        } catch (err) {} 
        finally { await browser.close(); }

        return Promise.resolve({ subtitles: finalniTitulky });
    });
}

// --- HTTP SERVER ---
const addonInterface = builder.getInterface();
const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        const host = req.headers.host;
        const publicHost = process.env.SPACE_HOST || host;
        const spaceId = process.env.SPACE_ID || "SnaexCZ/community-subs-template";
        const manifestUrl = `${publicHost}/manifest.json`;

        if (IS_CONFIGURED) {
            res.end(privateTemplate(manifestUrl));
        } else {
            res.end(publicTemplate(spaceId));
        }
        return;
    }

    if (req.url.startsWith("/sub/")) {
        const subId = req.url.split("/")[2].replace(".vtt", "");
        if (subtitlesCache.has(subId)) {
            const data = subtitlesCache.get(subId);
            res.setHeader("Content-Type", "text/vtt; charset=utf-8");
            res.writeHead(200);
            res.end(data.content);
        } else {
            res.writeHead(404);
            res.end("Expired");
        }
        return;
    }

    if (IS_CONFIGURED) {
        const router = getRouter(addonInterface);
        router(req, res, () => { res.writeHead(404); res.end(); });
    } else {
        res.writeHead(503);
        res.end("Not Configured");
    }
});

const port = 7860;
server.listen(port, "0.0.0.0", () => {
    console.log(`✅ Server běží na portu ${port}`);
});