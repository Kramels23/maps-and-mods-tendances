const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static("public"));

async function scrapeCurseForge(category) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    let results = [];
    let currentPage = 1;
    let fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28); // Date limite : 4 semaines


    console.log(`🔍 Démarrage du scraping des ${category}...`);

    while (true) {
        let url = `https://www.curseforge.com/minecraft/search?page=${currentPage}&pageSize=50&sortBy=creation+date&class=${category}`;
        console.log(`📡 Scraping page ${currentPage}... (${category})`);

        await page.goto(url, { waitUntil: "domcontentloaded" });

        await page.waitForSelector(".project-card", { timeout: 10000 }).catch(() => {
            console.log(`⚠️ Aucun ${category} détecté sur cette page.`);
        });

        try {
            const items = await page.evaluate((fourWeeksAgo, currentPage) => {
                let elements = document.querySelectorAll(".project-card");
                let results = [];

                elements.forEach(item => {
                    let titleElement = item.querySelector(".name .ellipsis");
                    let urlElement = item.querySelector(".overlay-link");
                    let imageElement = item.querySelector(".art img");
                    let downloadsElement = item.querySelector(".detail-downloads");
                    let dateElement = item.querySelector(".detail-created span");
                    let descriptionElement = item.querySelector(".description");

                    let title = titleElement ? titleElement.innerText.trim() : "Sans titre";
                    let url = urlElement ? "https://www.curseforge.com" + urlElement.getAttribute("href") : "";
                    let image = imageElement ? imageElement.getAttribute("src") : "";
                    let downloads = downloadsElement ? parseInt(downloadsElement.innerText.replace(/,/g, '')) : 0;
                    let description = descriptionElement ? descriptionElement.innerText.trim() : "Pas de description";

                    let dateText = dateElement ? dateElement.innerText.trim() : null;
                    let formattedDate = "Date inconnue";
                    let daysAgo = "Inconnu";

                    if (dateText) {
                        let modDate = new Date(dateText);
                        if (!isNaN(modDate.getTime())) {
                            formattedDate = modDate.toISOString().split("T")[0];
                            let timeDiff = Math.floor((new Date() - modDate) / (1000 * 60 * 60 * 24));
                            daysAgo = `${timeDiff} jours`;
                        }
                    }

                    if (title && url && formattedDate !== "Date inconnue") {
                        let modDate = new Date(formattedDate);
                        if (modDate >= new Date(fourWeeksAgo)) {
                            results.push({ title, url, description, downloads, image, date: formattedDate, page: currentPage, timeAgo: daysAgo });
                        }
                    }
                });

                return results;
            }, fourWeeksAgo, currentPage);

            if (items.length === 0) {
                console.log(`🛑 Fin du scraping (page ${currentPage} ne contient aucun ${category} récent)`);
                break;
            }

            results = results.concat(items);

        } catch (error) {
            console.error(`❌ Erreur sur la page ${currentPage}:`, error);
            break;
        }

        currentPage++;
    }

    await browser.close();

    results.sort((a, b) => b.downloads - a.downloads);
    return { top10: results.slice(0, 10), all: results };
}

// 📢 Endpoint pour récupérer Mods et Maps
app.get("/data", async (req, res) => {
    console.log("📡 Scraping Mods et Maps...");
    const [mods, maps] = await Promise.all([scrapeCurseForge("mc-mods"), scrapeCurseForge("worlds")]);
    console.log("✅ Scraping terminé !");
    res.json({ mods, maps });
});

app.listen(PORT, () => console.log(`✅ Serveur en local sur http://localhost:${PORT}`));
