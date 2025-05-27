export type CityName = 'VISAKHAPATNAM' | 'VELLORE' | 'GHAZIABAD';

export const AVAILABLE_CITIES: CityName[] = ['VISAKHAPATNAM', 'VELLORE', 'GHAZIABAD'];

export interface CityBoundary {
    north: number;
    south: number;
    east: number;
    west: number;
}

export const CITY_BOUNDARIES: Record<CityName, CityBoundary> = {
    VISAKHAPATNAM: {
        north: 18.0,
        south: 17.5,
        east: 83.5,
        west: 83.0
    },
    VELLORE: {
        north: 13.0,
        south: 12.5,
        east: 79.5,
        west: 79.0
    },
    GHAZIABAD: {
        north: 28.8,
        south: 28.5,
        east: 77.6,
        west: 77.3
    }
};

export const MAX_ROUTE_DISTANCE = 100000; // 100km in meters

export function getCityBoundary(city: string): CityBoundary | undefined {
    const upperCity = city.toUpperCase() as CityName;
    return CITY_BOUNDARIES[upperCity];
} 