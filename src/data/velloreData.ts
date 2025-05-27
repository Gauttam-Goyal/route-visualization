// Export only Vellore data
import { RAW_DATA } from './rawData';

const lines = RAW_DATA.split('\n');
const header = lines[0];
const velloreData = lines
  .filter(line => line.includes('vellore'))
  .join('\n');

export default `${header}\n${velloreData}`; 