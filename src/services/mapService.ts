import { RouteData } from '../types';
import * as L from 'leaflet';
import { getCityBoundary } from '../utils/constants';

export const getHexagonCentroidsForRoutes = (hexagonCentroids: any[], routes: RouteData[]): any[] => {
    if (routes.length === 0) return [];
    
    // Get the city boundary for the first route's city
    const cityBoundary = getCityBoundary(routes[0].city);
    if (!cityBoundary) {
        console.warn(`No boundary found for city: ${routes[0].city}`);
        return [];
    }

    // Create a map to store hexagon data including all routes and cluster IDs it appears in
    const hexagonMap = new Map<string, {
        routes: Set<string>,  // Set of "fe_number-date" strings
        clusterIds: Set<number>,
        centroid: any
    }>();

    // Collect all hexagons and their route/cluster information
    routes.forEach(route => {
        // Check if any activity in the route is outside the boundary
        const hasActivityOutsideBoundary = route.activities.some(activity => {
            if (activity.type === 'delivery') {
                if (activity.lat < cityBoundary.south || 
                    activity.lat > cityBoundary.north || 
                    activity.lng < cityBoundary.west || 
                    activity.lng > cityBoundary.east) {
                    console.warn(`Route ${route.fe_number} on ${route.date} has activity outside city boundary: ${activity.hexagon_index}`);
                    return true;
                }
            }
            return false;
        });

        // Skip the entire route if any activity is outside boundary
        if (hasActivityOutsideBoundary) {
            return;
        }

        // Process the route only if all activities are within boundary
        if (route.activities && Array.isArray(route.activities)) {
            route.activities.forEach(activity => {
                if (activity.type === 'delivery' && activity.hexagon_index) {
                    const hexId = String(activity.hexagon_index);
                    const routeKey = `${route.fe_number}-${route.date}`;
                    
                    if (!hexagonMap.has(hexId)) {
                        hexagonMap.set(hexId, {
                            routes: new Set([routeKey]),
                            clusterIds: new Set([activity.cluster_id]),
                            centroid: null
                        });
                    } else {
                        const hexData = hexagonMap.get(hexId)!;
                        hexData.routes.add(routeKey);
                        if (activity.cluster_id) {
                            hexData.clusterIds.add(activity.cluster_id);
                        }
                    }
                }
            });
        }
    });

    // Match with centroids and prepare final data
    const enrichedCentroids = hexagonCentroids
        .filter(centroid => {
            // Check if centroid is within city boundaries
            if (centroid.lat < cityBoundary.south || 
                centroid.lat > cityBoundary.north || 
                centroid.lng < cityBoundary.west || 
                centroid.lng > cityBoundary.east) {
                console.warn(`Centroid outside city boundary: ${centroid.hexagon_id}`);
                return false;
            }
            return hexagonMap.has(centroid.hexagon_id);
        })
        .map(centroid => {
            const hexData = hexagonMap.get(centroid.hexagon_id)!;
            return {
                ...centroid,
                appears_in_multiple_routes: hexData.routes.size > 1,
                all_cluster_ids: Array.from(hexData.clusterIds),
                cluster_id: hexData.clusterIds.size === 1 ? 
                    Array.from(hexData.clusterIds)[0] : 
                    null  // Will be used to show * in the UI
            };
        });

    return enrichedCentroids;
}; 