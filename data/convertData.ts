import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the CSV file
const csvPath = join(__dirname, 'all_routes_ghaz.csv');
let csvContent = readFileSync(csvPath, 'utf-8');

// Transform the content
csvContent = csvContent
  .replace('ofd_date', 'date')
  .replace('route', 'activities');

// Replace all double double-quotes with backslash-escaped quotes inside quoted fields
// This regex finds quoted fields and replaces "" with \"
const transformedContent = csvContent.replace(/"([^"]*(""[^"]*)*)"/g, (match) => {
  return match.replace(/""/g, '\\"');
});

// Convert the CSV content to the required format
const rawDataContent = `export const RAW_DATA = \`${transformedContent}\`;`;

// Write to rawData.ts using relative path
const outputPath = join(__dirname, '..', 'src', 'data', 'rawData.ts');
writeFileSync(outputPath, rawDataContent);

console.log('Conversion completed successfully!'); 