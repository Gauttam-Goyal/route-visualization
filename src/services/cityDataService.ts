import { RouteData } from '../types';
import { CityName } from '../utils/constants';

const parseCSVData = (raw: string): RouteData[] => {
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',');
  
  const reviver = (key: string, value: any) => {
    if (key === 'hexagon_index' && typeof value === 'number') {
      return String(value);
    }
    return value;
  };

  return lines.slice(1).map(line => {
    const match = line.match(/(?:"[^"]*"|[^,])+/g);
    if (!match) return undefined;
    const obj: any = {};
    headers.forEach((header, i) => {
      let value: any = match[i];
      if (header === 'activities') {
        try {
          const jsonStr = value.replace(/^"|"$/g, '');
          const quotedStr = jsonStr.replace(/"hexagon_index":(\d{18})/g, '"hexagon_index":"$1"');
          const parsed = JSON.parse(quotedStr, reviver);
          value = parsed[0].activities;
        } catch (error) {
          console.error('Error parsing activities:', error);
          value = [];
        }
        obj[header] = value;
      } else {
        obj[header] = value ?? '';
      }
    });
    return obj as RouteData;
  }).filter((x): x is RouteData => !!x);
};

export const loadCityData = async (city: CityName): Promise<RouteData[]> => {
  try {
    const module = await import(`../data/${city.toLowerCase()}Data.ts`);
    const rawData = module.default;
    return parseCSVData(rawData).filter(route => route.city.toUpperCase() === city);
  } catch (error) {
    console.error(`Error loading data for city ${city}:`, error);
    return [];
  }
}; 