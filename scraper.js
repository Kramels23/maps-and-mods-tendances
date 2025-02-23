const puppeteer = require("puppeteer");

async function scrapeCurseForge() {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    let results = [];
    let currentPage = 1;
    let twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14); // Date limite : 2 semaines

    console.log("🔍 Démarrage du scraping...");

    while (true) {
        console.log(`📡 Chargement de la page ${currentPage}...`);

        // ✅ URL correcte pour récupérer les mods récents
        let url = `https://www.curseforge.com/minecraft/search?page=${currentPage}&pageSize=50&sortBy=creation+date&class=mc-mods`;
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.screenshot({ path: "curseforge_page.png", fullPage: true });
        console.log("📸 Capture d'écran enregistrée !");


        // 🔥 Extraire les mods de la page
        const mods = await page.evaluate((twoWeeksAgo) => {
            let items = document.querySelectorAll(".project-card"); // ✅ Récupérer chaque carte de mod
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
                let downloads = downloadsElement ? downloadsElement.innerText.trim() : "0";
                let description = descriptionElement ? descriptionElement.innerText.trim() : "Pas de description";
                let dateText = dateElement ? dateElement.innerText.trim() : null;

                if (title && url && dateText) {
                    let modDate = new Date(dateText);

                    // ✅ Vérifier si le mod a été créé il y a moins de 2 semaines
                    if (modDate >= new Date(twoWeeksAgo)) {
                        results.push({ title, url, description, downloads, image, date: dateText });
                    }
                }
            });

            return results;
        }, twoWeeksAgo);

        results = results.concat(mods);

        // 📌 Si aucun mod récent n'est trouvé, on arrête le scraping
        if (mods.length === 0) {
            console.log("✅ Fin du scraping (aucun mod récent trouvé)");
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

        // Passer à la page suivante
        currentPage++;
    }

    await browser.close();
    return results;
}

// 📢 Lancer le scraper et afficher les résultats
scrapeCurseForge().then(data => console.log(data)).catch(console.error);
