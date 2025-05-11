import { RouteData } from '../types';
import * as L from 'leaflet';

export const getHexagonCentroidsForRoutes = (hexagonCentroids: any[], routes: RouteData[]): any[] => {
    // Get all hexagon indices from the routes
    const routeHexagonIndices = new Set<string>();
    routes.forEach(route => {
        if (route.activities && Array.isArray(route.activities)) {
            route.activities.forEach(activity => {
                if (activity.type === 'delivery' && activity.hexagon_index) {
                    routeHexagonIndices.add(String(activity.hexagon_index));
                }
            });
        }
    });

    // Filter centroids that match the route hexagons
    return hexagonCentroids.filter(centroid => 
        routeHexagonIndices.has(centroid.hexagon_id)
    );
}; 