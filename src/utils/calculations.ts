import { RouteData, DistanceMetrics } from '../types';

export function calculateAverages(data: RouteData[]): DistanceMetrics {
    if (data.length === 0) {
        return {
            avgDistance: 0,
            totalRoutes: 0,
            totalDistance: 0,
            cityAverage: undefined,
            dcAverage: undefined,
            feAverage: undefined,
            dcToHexAverage: undefined,
            hexToHexAverage: undefined
        };
    }

    const totalDistance = data.reduce((sum, route) => sum + parseFloat(route.total_distance), 0);
    const avgDistance = totalDistance / data.length;

    // Calculate city average
    const cityMap = new Map<string, { count: number, totalDistance: number }>();
    data.forEach(route => {
        const existing = cityMap.get(route.city) || { count: 0, totalDistance: 0 };
        cityMap.set(route.city, {
            count: existing.count + 1,
            totalDistance: existing.totalDistance + parseFloat(route.total_distance)
        });
    });
    const cityAverage = Array.from(cityMap.values())
        .reduce((sum, { totalDistance, count }) => sum + (totalDistance / count), 0) / cityMap.size;

    // Calculate DC average
    const dcMap = new Map<string, { count: number, totalDistance: number }>();
    data.forEach(route => {
        const existing = dcMap.get(route.dc_code) || { count: 0, totalDistance: 0 };
        dcMap.set(route.dc_code, {
            count: existing.count + 1,
            totalDistance: existing.totalDistance + parseFloat(route.total_distance)
        });
    });
    const dcAverage = Array.from(dcMap.values())
        .reduce((sum, { totalDistance, count }) => sum + (totalDistance / count), 0) / dcMap.size;

    // Calculate FE average
    const feMap = new Map<string, { count: number, totalDistance: number }>();
    data.forEach(route => {
        const existing = feMap.get(route.fe_number) || { count: 0, totalDistance: 0 };
        feMap.set(route.fe_number, {
            count: existing.count + 1,
            totalDistance: existing.totalDistance + parseFloat(route.total_distance)
        });
    });
    const feAverage = Array.from(feMap.values())
        .reduce((sum, { totalDistance, count }) => sum + (totalDistance / count), 0) / feMap.size;

    // Calculate DC to Hex average
    let totalDcToHexDistance = 0;
    let totalDcToHexCount = 0;
    data.forEach(route => {
        route.activities.forEach(activity => {
            if (activity.type === 'delivery' && activity.distance_from_dc) {
                totalDcToHexDistance += activity.distance_from_dc;
                totalDcToHexCount++;
            }
        });
    });
    const dcToHexAverage = totalDcToHexCount > 0 ? totalDcToHexDistance / totalDcToHexCount : undefined;

    // Calculate Hex to Hex average
    let totalHexToHexDistance = 0;
    let totalHexToHexCount = 0;
    data.forEach(route => {
        const activities = route.activities.sort((a, b) => a.sequence - b.sequence);
        for (let i = 0; i < activities.length - 1; i++) {
            const current = activities[i];
            const next = activities[i + 1];
            if (current.type === 'delivery' && next.type === 'delivery' && current.distance_from_prev) {
                totalHexToHexDistance += current.distance_from_prev;
                totalHexToHexCount++;
            }
        }
    });
    const hexToHexAverage = totalHexToHexCount > 0 ? totalHexToHexDistance / totalHexToHexCount : undefined;

    return {
        avgDistance,
        totalRoutes: data.length,
        totalDistance,
        cityAverage,
        dcAverage,
        feAverage,
        dcToHexAverage,
        hexToHexAverage
    };
}