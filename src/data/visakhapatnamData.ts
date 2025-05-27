// Export only Visakhapatnam data
import { RAW_DATA_2 } from './routeData';

const lines = RAW_DATA_2.split('\n');
const header = lines[0];
const visakhapatnamData = lines
  .filter(line => line.includes('visakhapatnam'))
  .join('\n');

export default `${header}\n${visakhapatnamData}`; 