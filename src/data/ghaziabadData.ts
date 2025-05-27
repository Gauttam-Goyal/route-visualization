// Export only Ghaziabad data
import { RAW_DATA } from './rawData';

const lines = RAW_DATA.split('\n');
const header = lines[0];
const ghaziabadData = lines
  .filter(line => line.includes('ghaziabad'))
  .join('\n');

export default `${header}\n${ghaziabadData}`; 