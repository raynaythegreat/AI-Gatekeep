const sharp = require('sharp');
const png2icons = require('png2icons');
const fs = require('fs');
const path = require('path');

const SOURCE_SVG = path.join(__dirname, '../assets/icon-gradient.svg');
const OUTPUT_DIR = path.join(__dirname, '../assets');
const icoOutput = path.join(__dirname, '../assets/icon.ico');
const icnsOutput = path.join(__dirname, '../assets/icon.icns');
const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('Generating icons from:', SOURCE_SVG);

  // Generate main PNG (512x512)
  console.log('Generating main PNG...');
  await sharp(SOURCE_SVG)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'icon.png'));
  console.log('✓ Created: assets/icon.png');

  // Generate favicon for web (32x32)
  console.log('Generating favicon...');
  await sharp(SOURCE_SVG)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Created: public/favicon.png');

  // Read PNG buffer for ICO/ICNS conversion
  const pngBuffer = fs.readFileSync(path.join(OUTPUT_DIR, 'icon.png'));

  // Generate Windows ICO
  console.log('Generating Windows icon...');
  const icoBuffer = png2icons.createICO(pngBuffer, png2icons.HERMITE, 0, false, true);
  fs.writeFileSync(icoOutput, icoBuffer);
  console.log('✓ Created: assets/icon.ico');

  // Generate macOS ICNS
  console.log('Generating macOS icon...');
  const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.HERMITE, 0);
  fs.writeFileSync(icnsOutput, icnsBuffer);
  console.log('✓ Created: assets/icon.icns');

  console.log('\n✅ Icon generation complete!');
  console.log('Files created:');
  console.log('  - assets/icon.png (512x512 PNG)');
  console.log('  - assets/icon.ico (Windows)');
  console.log('  - assets/icon.icns (macOS)');
  console.log('  - public/favicon.png (32x32 favicon)');
}

generateIcons().catch((error) => {
  console.error('Icon generation failed:', error);
  process.exit(1);
});
