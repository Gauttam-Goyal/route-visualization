import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the CSV file
const csvPath = join(__dirname, 'all_routes_ghaz.csv');
const csvPath_vizag = join(__dirname, 'all_routes_vizag.csv');
let csvContent = readFileSync(csvPath, 'utf-8');
let csvContent_vizag = readFileSync(csvPath_vizag, 'utf-8');

// Transform the content
csvContent = csvContent
  .replace('ofd_date', 'date')
  .replace('route', 'activities');

csvContent_vizag = csvContent_vizag
.replace('ofd_date', 'date')
.replace('route', 'activities');

// Replace all double double-quotes with backslash-escaped quotes inside quoted fields
// This regex finds quoted fields and replaces "" with \"
const transformedContent = csvContent.replace(/"([^"]*(""[^"]*)*)"/g, (match) => {
  return match.replace(/""/g, '\\"');
});

const transformedContent_vizag = csvContent_vizag.replace(/"([^"]*(""[^"]*)*)"/g, (match) => {
  return match.replace(/""/g, '\\"');
});

// Convert the CSV content to the required format
const rawDataContent = `export const RAW_DATA = \`${transformedContent}\`;`;
const rawDataContent_vizag = `export const RAW_DATA_2 = \`${transformedContent_vizag}\`;`;

// Write to rawData.ts using relative path
const outputPath = join(__dirname, '..', 'src', 'data', 'rawData.ts');
const outputPath_vizag = join(__dirname, '..', 'src', 'data', 'routeData.ts');

writeFileSync(outputPath, rawDataContent);
writeFileSync(outputPath_vizag, rawDataContent_vizag);

console.log('Conversion completed successfully!'); 