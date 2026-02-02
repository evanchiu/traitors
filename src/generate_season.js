const fs = require("fs");
const path = require("path");

let season;
if (process.argv.length > 2) {
  season = parseInt(process.argv[2]);
} else {
  console.log(`Usage ${process.argv[1]} <season>`);
  console.log(`  e.g. ${process.argv[1]} 1`);
  process.exit(1);
}

const DATA_FILE = path.resolve(__dirname, `../data/traitors-s${season}.json`);
// output everything to dist
const OUT_DIR = path.resolve(__dirname, "../dist");
const OUT_FILE = path.join(OUT_DIR, `season${season}.html`);
const IMAGES_DIR = path.resolve(__dirname, "../dist/images");

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeName(name) {
  return (
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "image"
  );
}

if (!fs.existsSync(DATA_FILE)) {
  console.error("Data file not found:", DATA_FILE);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

// Sort so that:
// 1) players still in the game (eliminated === 0) come first, sorted alphabetically;
// 2) eliminated players come after, sorted by eliminated number descending (most recently eliminated first).
data.sort((a, b) => {
  const aEl = Number(
    a && typeof a.eliminated !== "undefined" ? a.eliminated : 0,
  );
  const bEl = Number(
    b && typeof b.eliminated !== "undefined" ? b.eliminated : 0,
  );

  const aAlive = aEl === 0 ? 1 : 0;
  const bAlive = bEl === 0 ? 1 : 0;
  if (aAlive !== bAlive) return bAlive - aAlive;

  // both alive: alphabetical
  if (aAlive && bAlive) {
    const an = (a && a.name ? String(a.name) : "").toLowerCase();
    const bn = (b && b.name ? String(b.name) : "").toLowerCase();
    return an.localeCompare(bn);
  }

  // both eliminated: most recently eliminated first (higher eliminated number first)
  if (!aAlive && !bAlive) {
    if (bEl !== aEl) return bEl - aEl;
    const an = (a && a.name ? String(a.name) : "").toLowerCase();
    const bn = (b && b.name ? String(b.name) : "").toLowerCase();
    return an.localeCompare(bn);
  }

  return 0;
});

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const rows = data.map((person) => {
  const name = escapeHtml(person.name);
  const background = escapeHtml(person.background || "");
  const source = person.image_source || "";
  // Pick an explicit image if available, otherwise use a lightweight placeholder.
  const imgUrl = (person.images && person.images.large) || null;
  const placeholder =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="400" height="520"><rect width="100%" height="100%" fill="#efefef"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ccc" font-family="Arial,Helvetica" font-size="20">Photo</text></svg>`,
    );

  // Prefer a downloaded local copy (dist/images) if present. Filenames are derived from the
  // person's name and the image URL extension. If a local file is not present, fall back to
  // the remote URL (or a placeholder).
  let imgSrc = placeholder;
  if (imgUrl) {
    try {
      const urlPath = new URL(imgUrl).pathname;
      let ext = path.extname(urlPath) || "";
      ext = ext.split("?")[0] || "";
      if (!ext) ext = ".jpg";
      const filename = safeName(person.name) + ext;
      const localPath = path.join(IMAGES_DIR, filename);
      if (fs.existsSync(localPath)) {
        // relative path from the output directory; use forward slashes for web
        const rel = path.relative(OUT_DIR, localPath).replace(/\\/g, "/");
        imgSrc = escapeHtml(rel);
      } else {
        imgSrc = escapeHtml(imgUrl);
      }
    } catch (err) {
      imgSrc = escapeHtml(imgUrl);
    }
  }

  // Status classes: alive (default), traitor, eliminated
  // New schema: person.is_traitor (boolean) and person.eliminated (integer; 0 = still in game)
  const eliminatedNum = Number(
    person && typeof person.eliminated !== "undefined" ? person.eliminated : 0,
  );
  let statusClass = "";
  if (eliminatedNum > 0 && person.is_traitor)
    statusClass = "status-eliminated-traitor";
  else if (eliminatedNum > 0) statusClass = "status-eliminated";
  else if (person && person.is_traitor) statusClass = "status-traitor";
  else statusClass = "status-alive";

  const eliminatedStyle = person.murdered ? "murdered" : "banished";

  // If eliminated, show the elimination order number in the subtitle (e.g. — eliminated #3)
  const eliminatedMethod =
    eliminatedNum > 0
      ? ` — ${eliminatedStyle} #${escapeHtml(String(eliminatedNum))}`
      : "";

  const imgTag = `<img src="${imgSrc}" alt="${name}" class="person-img" loading="lazy">`;

  return `
    <div class="card ${statusClass}">
      <div class="img">${imgTag}</div>
      <div class="meta">
        <div class="title">${name}</div>
        <div class="subtitle">${background}${eliminatedMethod}</div>
      </div>
    </div>
  `;
});

const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>The Traitors — Season ${season}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:Arial,Helvetica,sans-serif;padding:8px;background: #0f172a;color: white;}
    h1{margin-bottom:6px}
    /* Default on small screens: 3 columns with tighter spacing */
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    /* On wider screens, allow responsive auto-fill with a comfortable min width */
    @media (min-width: 640px) {
      .grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
    }
    .card{border-radius:6px;overflow:hidden;background:#fff;border:1px solid #e6e6e6}
    .meta{padding:10px}
    .title{font-weight:700}
    .subtitle{font-size:13px;color:#666;margin-top:6px}
    a{color:#0366d6}
    .note{color:#555;margin-bottom:12px}

    /* Image */
  .img{width:100%;height:160px;overflow:hidden;background:#efefef}
  /* Shift image framing upward so less is cropped from the top and more from the bottom */
  .person-img{width:100%;height:100%;object-fit:cover;object-position:center 20%;display:block}

    /* Status styles requested:
       1) alive: white background with light gray border
       2) traitor: deep scarlet background and white text
       3) eliminated: dark gray background and grayscale image; show whether banished/murdered in subtitle
    */
    .status-alive{background:#fff;border:1px solid #e6e6e6;color:#222}

    .status-traitor{background:#7a031b;color:#fff;border:1px solid rgba(0,0,0,0.08)}
    .status-traitor .meta{color:#fff}
    .status-traitor a{color:rgba(255,255,255,0.9)}
    .status-traitor .subtitle{color:#ccc}

    .status-eliminated{background:#2f2f2f;color:#ddd;border:1px solid #222}
    .status-eliminated .meta{color:#ddd}
    .status-eliminated .subtitle{color:#bbb}
    /* grayscale the image for eliminated players */
    .status-eliminated .person-img{filter:grayscale(100%);opacity:0.9}

    .status-eliminated-traitor{background:#7a031b;color:#ddd;border:1px solid #222}
    .status-eliminated-traitor .meta{color:#ddd}
    .status-eliminated-traitor .subtitle{color:#bbb}
    /* grayscale the image for eliminated players */
    .status-eliminated-traitor .person-img{filter:grayscale(100%);opacity:0.9}

    .source{margin-top:6px;font-size:13px;color:rgba(0,0,0,0.55)}
    .status-traitor .source{color:rgba(255,255,255,0.85)}

  </style>
</head>
<body>
  <h1>The Traitors - Season ${season}</h1>
  <div class="grid">
    ${rows.join("\n")}
  </div>
</body>
</html>
`;

fs.writeFileSync(OUT_FILE, html, "utf8");
console.log("Wrote", OUT_FILE);
