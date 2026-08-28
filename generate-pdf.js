const fs = require('fs');
const PDFDocument = require('pdfkit');

const markdownContent = fs.readFileSync('prototype-mvp.md', 'utf8');

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream('prototype-mvp.pdf'));

const lines = markdownContent.split('\n');
let y = 50;
const lineHeight = 14;
const fontSize = 10;
const headingFontSize = 14;

doc.font('Helvetica');

for (const line of lines) {
  if (y > 750) {
    doc.addPage();
    y = 50;
  }

  if (line.startsWith('# ')) {
    doc.fontSize(headingFontSize + 4).font('Helvetica-Bold').text(line.slice(2), 50, y);
    y += lineHeight * 1.5;
  } else if (line.startsWith('## ')) {
    doc.fontSize(headingFontSize + 2).font('Helvetica-Bold').text(line.slice(3), 50, y);
    y += lineHeight * 1.3;
  } else if (line.startsWith('### ')) {
    doc.fontSize(headingFontSize).font('Helvetica-Bold').text(line.slice(4), 50, y);
    y += lineHeight * 1.2;
  } else if (line.startsWith('#### ')) {
    doc.fontSize(fontSize + 2).font('Helvetica-Bold').text(line.slice(5), 50, y);
    y += lineHeight * 1.1;
  } else if (line.startsWith('```')) {
    doc.fontSize(fontSize - 1).font('Courier').fillColor('gray');
  } else if (line.startsWith('|') && line.includes('|')) {
    doc.fontSize(fontSize - 1).font('Courier').fillColor('black');
    doc.text(line, 50, y, { width: 512 });
    y += lineHeight;
  } else if (line.startsWith('- ') || line.startsWith('* ')) {
    doc.fontSize(fontSize).font('Helvetica').fillColor('black');
    doc.text('\u2022 ' + line.slice(2), 60, y, { width: 502 });
    y += lineHeight;
  } else if (line.match(/^\d+\.\s/)) {
    doc.fontSize(fontSize).font('Helvetica').fillColor('black');
    doc.text(line, 60, y, { width: 502 });
    y += lineHeight;
  } else if (line.trim() === '') {
    y += lineHeight * 0.5;
  } else if (line.startsWith('**') && line.endsWith('**')) {
    doc.fontSize(fontSize + 1).font('Helvetica-Bold').fillColor('black');
    doc.text(line.slice(2, -2), 50, y, { width: 512 });
    y += lineHeight * 1.2;
  } else if (line.startsWith('>')) {
    doc.fontSize(fontSize - 1).font('Helvetica-Oblique').fillColor('gray');
    doc.text(line.slice(1).trim(), 55, y, { width: 507 });
    y += lineHeight;
  } else {
    doc.fontSize(fontSize).font('Helvetica').fillColor('black');
    doc.text(line, 50, y, { width: 512 });
    y += lineHeight;
  }
}

doc.end();
console.log('PDF generated successfully!');