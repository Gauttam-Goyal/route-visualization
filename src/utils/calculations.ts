import { RouteData, DistanceMetrics } from '../types';

export function calculateAverages(data: RouteData[]): DistanceMetrics {
    if (data.length === 0) {
        return {
            avgDistance: 0,
            totalRoutes: 0,
            totalDistance: 0,
            cityAverage: undefined,
            dcAverage: undefined,
            feAverage: undefined
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

    return {
        avgDistance,
        totalRoutes: data.length,
        totalDistance,
        cityAverage,
        dcAverage,
        feAverage
    };
}