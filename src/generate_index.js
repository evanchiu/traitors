const fs = require("fs");
const path = require("path");


const html = generateTraitorsLandingPage(path.resolve(__dirname, `../data`));
const htmlFile = path.resolve(__dirname, "../dist/index.html");
fs.writeFileSync(htmlFile, html, "utf8");
console.log("Wrote", htmlFile);

function generateTraitorsLandingPage(dataDir) {
  // 1. Read directory
  const files = fs.readdirSync(dataDir);

  // 2. Extract seasons
  const seasons = files
    .map(file => {
      const match = file.match(/^traitors-s(\d+)\.json$/);
      if (!match) return null;

      const season = Number(match[1]);
      return {
        season,
        href: `season${season}.html`
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.season - b.season);

  // 3. Generate tiles HTML
  const tilesHtml = seasons
    .map(
      ({ season, href }) => `
        <a class="season-tile" href="${href}">
          <span>Season</span>
          <strong>${season}</strong>
        </a>
      `
    )
    .join("");

  // 4. Return full HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>The Traitors – Seasons</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f172a;
      color: white;
      margin: 0;
      padding: 3rem 1.5rem;
      text-align: center;
    }

    h1 {
      margin-bottom: 2.5rem;
      font-size: 2.5rem;
    }

    .season-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1.5rem;
      max-width: 900px;
      margin: 0 auto;
    }

    .season-tile {
      background: linear-gradient(135deg, #0f172a, #7a031b);
      border-radius: 18px;
      padding: 2.5rem 1rem;
      text-decoration: none;
      color: white;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .season-tile span {
      display: block;
      font-size: 0.9rem;
      opacity: 0.85;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .season-tile strong {
      display: block;
      font-size: 2.75rem;
      margin-top: 0.25rem;
    }

    .season-tile:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 35px rgba(0,0,0,0.35);
    }
  </style>
</head>
<body>
  <h1>The Traitors</h1>
  <div class="season-grid">
    ${tilesHtml}
  </div>
</body>
</html>`;
}