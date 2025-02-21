// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
const PORT = 3000;
const API_KEY = "TON_CLEF_API"; // Mets ta clé API CurseForge ici

// Récupérer les mods tendances
app.get("/mods", async (req, res) => {
    try {
        const response = await axios.get("https://api.curseforge.com/v1/mods/search", {
            headers: {
                "x-api-key": API_KEY
            },
            params: {
                gameId: 432, // Minecraft
                sectionId: 6, // Mods
                sortField: 2, // Popularité
                sortOrder: "desc",
                pageSize: 50,
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: "Erreur API CurseForge", error: error.message });
    }
});

// Récupérer les maps tendances
app.get("/maps", async (req, res) => {
    try {
        const response = await axios.get("https://api.curseforge.com/v1/mods/search", {
            headers: {
                "x-api-key": API_KEY
            },
            params: {
                gameId: 432, // Minecraft
                sectionId: 17, // Maps
                sortField: 2,
                sortOrder: "desc",
                pageSize: 50,
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: "Erreur API CurseForge", error: error.message });
    }
});

app.listen(PORT, () => console.log(`✅ Serveur backend sur http://localhost:${PORT}`));
