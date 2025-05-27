import { RouteData } from '../types';
import * as L from 'leaflet';

export const getHexagonCentroidsForRoutes = (hexagonCentroids: any[], routes: RouteData[]): any[] => {
    // Create a map to store hexagon data including all routes and cluster IDs it appears in
    const hexagonMap = new Map<string, {
        routes: Set<string>,  // Set of "fe_number-date" strings
        clusterIds: Set<number>,
        centroid: any
    }>();

    // Collect all hexagons and their route/cluster information
    routes.forEach(route => {
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
        .filter(centroid => hexagonMap.has(centroid.hexagon_id))
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