const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'c:\\temp\\SentinelFi\\backend\\BACKEND-DOCUMENTATIONS\\SEC. 2.0 COMMERCIAL_SUBMISSION MAST REFURBISHMENT OMOKU.pdf';

let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('c:\\temp\\SentinelFi\\extracted_pdf.txt', data.text);
    console.log('Extraction complete. Saved to extracted_pdf.txt');
}).catch(err => {
    console.error('Error extracting PDF:', err);
});
