const fs = require('fs');

const processUtility = (filePath, className) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Add Helper
    const helper = `
  static formatCurrencyWithContext(amount: number, context?: any): string {
    if (context && context.currencyRate && context.currencySymbol) {
      const converted = amount * context.currencyRate;
      return \`\${context.currencySymbol}\${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
    }
    return formatCurrency(amount);
  }
`;

    if (!content.includes('formatCurrencyWithContext(')) {
      content = content.replace(`export class ${className} {`, `export class ${className} {` + helper);
    }

    // Replace usages (excluding import)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('import { formatCurrency }')) continue;
      // replace formatCurrency(xyz) with ClassName.formatCurrencyWithContext(xyz, context)
      lines[i] = lines[i].replace(/formatCurrency\(([^)]+)\)/g, `${className}.formatCurrencyWithContext($1, context)`);
    }
    content = lines.join('\n');

    // Add context to signatures
    content = content.replace(/title: string = "([^"]+)",/g, 'title: string = "$1", context?: any,');
    content = content.replace(/title: string = "([^"]+)"\)/g, 'title: string = "$1", context?: any)');

    // PDF specific UI Header changes
    if (className === 'PdfUtility') {
      content = content.replace(
        /currentPage\.drawText\(title, \{\s*x: 50,\s*y: height - 30,\s*font: boldFont,\s*size: 18/g,
        `currentPage.drawText(context?.tenantName || "SentinelFi", { x: 50, y: height - 20, font: boldFont, size: 10, color: rgb(0.5, 0.5, 0.5) });
      currentPage.drawText(context?.projectName ? \`\${title} - \${context.projectName}\` : title, { x: 50, y: height - 35, font: boldFont, size: 14`
      );
      content = content.replace(
        /currentPage\.drawText\(title, {\s*x: 50,\s*y: height - 35,\s*font: boldFont,\s*size: 14/g,
        `currentPage.drawText(context?.tenantName || "SentinelFi", { x: 50, y: height - 20, font: boldFont, size: 10, color: rgb(0.5, 0.5, 0.5) });
      currentPage.drawText(context?.projectName ? \`\${title} - \${context.projectName}\` : title, { x: 50, y: height - 35, font: boldFont, size: 14`
      );
    }
    
    // Excel specific Header changes
    if (className === 'ExcelUtility') {
      content = content.replace(/const worksheet = workbook\.addWorksheet\(title\);/g, `const sheetTitle = context?.projectName ? context.projectName.substring(0,30) : title;
    const worksheet = workbook.addWorksheet(sheetTitle);
    worksheet.getCell('A1').value = context?.tenantName || "SentinelFi";
    worksheet.getCell('A2').value = title;
    worksheet.getCell('A3').value = \`Date: \${new Date().toLocaleDateString()}\`;
    // Note: The rest of the Excel rendering should be shifted by 4 rows if you want headers here.
    // For now, simple insert is fine if we just want Sheet name. Let's just use sheetTitle.
    `);
    content = content.replace(/const sheetTitle = context\?\.projectName \? context\.projectName\.substring\(0,30\) : title;\n    const worksheet = workbook\.addWorksheet\(sheetTitle\);\n    worksheet\.getCell\('A1'\)\.value.*/g, 
    'const sheetTitle = context?.projectName ? context.projectName.substring(0,30).replace(/[^a-zA-Z0-9 ]/g, "") : title.substring(0, 30);\n    const worksheet = workbook.addWorksheet(sheetTitle);');
    }

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${className}`);
  } catch (err) {
    console.error(`Failed ${className}`, err);
  }
};

processUtility('c:/temp/SentinelFi/backend/src/common/pdf.utility.ts', 'PdfUtility');
processUtility('c:/temp/SentinelFi/backend/src/common/excel.utility.ts', 'ExcelUtility');
processUtility('c:/temp/SentinelFi/backend/src/common/word.utility.ts', 'WordUtility');
