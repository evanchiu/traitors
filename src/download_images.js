const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

function safeName(name) {
  return (
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "image"
  );
}

function download(urlStr, dest) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const getter = u.protocol === "https:" ? https : http;
      const req = getter.get(u, (res) => {
        // follow redirects
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.destroy();
          return resolve(download(res.headers.location, dest));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(
            new Error(
              "Failed to download " + urlStr + " - status " + res.statusCode,
            ),
          );
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", (err) => {
          try {
            fs.unlinkSync(dest);
          } catch (e) {}
          reject(err);
        });
      });
      req.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

(async function main() {
  let season;
  if (process.argv.length > 2) {
    season = parseInt(process.argv[2]);
  } else {
    console.log(`Usage ${process.argv[1]} <season>`);
    console.log(`  e.g. ${process.argv[1]} 1`);
    process.exit(1);
  }

  const dataFile = path.resolve(__dirname, `../data/traitors-s${season}.json`);
  console.log(
    `Downloading images for traitors season ${season} using data file ${dataFile}`,
  );
  const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));

  if (!fs.existsSync(dataFile)) {
    console.error("Data file not found:", dataFile);
    process.exit(1);
  }

  const imagesDir = path.resolve(__dirname, "../dist/images");
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  let downloaded = 0;
  for (const person of data) {
    const imgUrl = person && person.images && person.images.large;
    if (!imgUrl) continue;

    // derive extension from URL path
    let ext = path.extname(new URL(imgUrl).pathname) || "";
    ext = ext.split("?")[0] || "";
    if (!ext) ext = ".jpg";

    const base = safeName(person.name);
    const filename = base + ext;
    const dest = path.join(imagesDir, filename);

    if (fs.existsSync(dest)) {
      console.log("Skipping (exists):", filename);
      continue;
    }

    try {
      console.log("Downloading:", imgUrl, "→", filename);
      await download(imgUrl, dest);
      downloaded++;
    } catch (err) {
      console.error("Error downloading", imgUrl, err.message || err);
    }
  }

  console.log(`Done. ${downloaded} new images saved to ${imagesDir}`);
})();
