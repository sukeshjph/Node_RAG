import { config } from "dotenv";
import fetch from "node-fetch";
import fs from "fs";

config();

const endpoint = process.env.AZURE_SEARCH_ENDPOINT || "";
const searchKey = process.env.AZURE_SEARCH_KEY || "";

async function createIndexRaw() {
    const schema = JSON.parse(await fs.promises.readFile("index.json", "utf8"));

    const res = await fetch(`${endpoint}/indexes/${schema.name}?api-version=2024-07-01`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "api-key": searchKey
        },
        body: JSON.stringify(schema)
    });

    if (!res.ok) {
        console.error("❌ Error:", await res.text());
    } else {
        console.log("✅ Index created:", schema.name);
    }
}

createIndexRaw();
