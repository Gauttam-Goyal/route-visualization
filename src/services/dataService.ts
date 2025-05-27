import { RouteData, LocationData } from '../types';

export async function fetchRouteData(): Promise<RouteData[]> {
    try {
        const response = await fetch('/data/routes.json');
        return await response.json();
    } catch (error) {
        console.error('Error fetching route data:', error);
        return [];
    }
}

export async function fetchLocationData(): Promise<LocationData> {
    try {
        const [dcResponse, hexagonResponse, mappingResponse] = await Promise.all([
            fetch('/data/dc-locations.json'),
            fetch('/data/hexagon-centroids.json'),
            fetch('/data/hexagon-customer-mapping.json')
        ]);

        const dcLocations = await dcResponse.json();
        const hexagonCentroids = await hexagonResponse.json();
        const hexagonCustomerMapping = await mappingResponse.json();

        return {
            dcLocations,
            hexagonCentroids,
            hexagonCustomerMapping
        };
    } catch (error) {
        console.error('Error fetching location data:', error);
        return {
            dcLocations: [],
            hexagonCentroids: [],
            hexagonCustomerMapping: []
        };
    }
}