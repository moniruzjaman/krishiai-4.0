const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="256" fill="#0A8A1F"/>
  <path d="M256 410C256 696 512 870 512 870C512 870 768 696 768 410C768 226 635 154 512 154C389 154 256 226 256 410Z" fill="white"/>
  <path d="M512 870C512 870 686 717 686 461C686 307 594 256 512 256C430 256 338 307 338 461C338 717 512 870 512 870Z" fill="#0A8A1F"/>
  <!-- Inner tech dot -->
  <circle cx="512" cy="461" r="50" fill="white"/>
</svg>
`;

const splashSvg = `
<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="#0A8A1F"/>
  <g transform="translate(854, 854)">
    <!-- Scale icon up slightly in the middle of the splash screen -->
    <path d="M256 410C256 696 512 870 512 870C512 870 768 696 768 410C768 226 635 154 512 154C389 154 256 226 256 410Z" fill="white"/>
    <path d="M512 870C512 870 686 717 686 461C686 307 594 256 512 256C430 256 338 307 338 461C338 717 512 870 512 870Z" fill="#0A8A1F"/>
    <circle cx="512" cy="461" r="50" fill="white"/>
  </g>
  <text x="1366" y="2000" font-family="sans-serif" font-weight="900" font-size="120" fill="white" text-anchor="middle">Krishi AI 4.0</text>
  <text x="1366" y="2150" font-family="sans-serif" font-weight="500" font-size="60" fill="rgba(255,255,255,0.8)" text-anchor="middle">Smart Agri Ecosystem</text>
</svg>
`;

async function generate() {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
  }

  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  // Capacitor needs icon.png (1024x1024 min) and splash.png (2732x2732 min) in assets folder
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));

  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    // Remove alpha channel (make background black or whatever, but icon SVG already has a background color)
    .flatten({ background: '#0A8A1F' })
    .png()
    .toFile(path.join(assetsDir, 'icon-only.png'));

  await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .flatten({ background: '#0A8A1F' })
    .png()
    .toFile(path.join(__dirname, 'public', 'icon-512x512.png'));

  await sharp(Buffer.from(iconSvg))
    .resize(192, 192)
    .flatten({ background: '#0A8A1F' })
    .png()
    .toFile(path.join(__dirname, 'public', 'icon-192x192.png'));

  await sharp(Buffer.from(splashSvg))
    .resize(2732, 2732)
    .flatten({ background: '#0A8A1F' })
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));

  console.log('Images generated successfully!');
}

generate().catch(console.error);
