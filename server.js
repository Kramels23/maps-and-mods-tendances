const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static("public"));

async function scrapeCurseForge() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    let results = [];
    let currentPage = 1;
    let twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14); // Date limite : 2 semaines

    console.log("🔍 Démarrage du scraping...");

    while (true) {
        let url = `https://www.curseforge.com/minecraft/search?page=${currentPage}&pageSize=50&sortBy=creation+date&class=mc-mods`;
        console.log(`📡 Scraping page ${currentPage}...`);

        await page.goto(url, { waitUntil: "networkidle2" });
        await new Promise(resolve => setTimeout(resolve, 3000));

        const mods = await page.evaluate((twoWeeksAgo) => {
            let items = document.querySelectorAll(".project-card");
            let results = [];

            items.forEach(item => {
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

                if (title && url && dateText) {
                    let modDate = new Date(dateText);

                    // ✅ Ne garder que les mods publiés ces 2 dernières semaines
                    if (modDate >= new Date(twoWeeksAgo)) {
                        results.push({ title, url, description, downloads, image, date: modDate });
                    }
                }
            });

            return results;
        }, twoWeeksAgo);

        results = results.concat(mods);

        // 📌 Vérifier si on a dépassé la limite des 2 semaines
        if (mods.length === 0 || results.some(mod => new Date(mod.date) < new Date(twoWeeksAgo))) {
            console.log("✅ Fin du scraping (aucun mod plus récent trouvé)");
            break;
        }

        // 📌 Vérifier s'il y a une page suivante
        const nextPageExists = await page.evaluate(() => {
            let nextButton = document.querySelector(".pagination-next a");
            return nextButton !== null;
        });

        if (!nextPageExists) {
            console.log("✅ Fin du scraping (plus de pages)");
            break;
        }

        currentPage++;
    }

    await browser.close();

    // 📌 Trier les mods par nombre de téléchargements (du plus téléchargé au moins téléchargé)
    results.sort((a, b) => b.downloads - a.downloads);

    // 📌 Garder uniquement le TOP 10
    return results.slice(0, 10);
}

// 📢 Endpoint pour récupérer les mods récents et triés
app.get("/mods", async (req, res) => {
    console.log("📡 Scraping des mods en cours...");
    const mods = await scrapeCurseForge();
    console.log("✅ Mods récupérés !");
    res.json({ data: mods });
});

app.listen(PORT, () => console.log(`✅ Serveur en local sur http://localhost:${PORT}`));
