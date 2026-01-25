const png2icons = require('png2icons');
const fs = require('fs');
const path = require('path');

const sourceIcon = path.join(__dirname, '../assets/icon.png');
const icoOutput = path.join(__dirname, '../assets/icon.ico');
const icnsOutput = path.join(__dirname, '../assets/icon.icns');

async function generateIcons() {
  console.log('Reading source icon:', sourceIcon);
  const pngBuffer = fs.readFileSync(sourceIcon);

  // Generate Windows ICO
  console.log('Generating Windows icon...');
  const icoBuffer = png2icons.createICO(pngBuffer, png2icons.HERMITE, 0, false, true);
  fs.writeFileSync(icoOutput, icoBuffer);
  console.log('✓ Created:', icoOutput);

  // Generate macOS ICNS
  console.log('Generating macOS icon...');
  const icnsBuffer = png2icons.createICNS(pngBuffer, png2icons.HERMITE, 0);
  fs.writeFileSync(icnsOutput, icnsBuffer);
  console.log('✓ Created:', icnsOutput);

  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
