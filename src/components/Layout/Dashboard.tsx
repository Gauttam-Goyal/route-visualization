import React, { useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Tabs, Tab } from '@mui/material';
import FilterPanel from '../Filters/FilterPanel';
import HexagonMap from '../Map/HexagonMap';
import DistanceMetrics from '../Analytics/DistanceMetrics';
import DistanceChart from '../Analytics/DistanceChart';
import SimulationPanel from '../Simulation/SimulationPanel';
import { RouteData, LocationData, Filters } from '../../types';
import { calculateAverages } from '../../utils/calculations';
import { MAX_ROUTE_DISTANCE, getCityBoundary } from '../../utils/constants';

interface DashboardProps {
    routeData: RouteData[];
    locationData: LocationData;
    loading: boolean;
    filters: Filters;
    setFilters: (filters: Filters) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    routeData,
    locationData,
    loading,
    filters,
    setFilters
}) => {
    const [activeTab, setActiveTab] = useState(0);

    // Extract unique values for filters
    const filterOptions = React.useMemo(() => {
        // Get all cities
        const cities = [...new Set(routeData.map(route => route.city))].sort();

        // Get DC codes and FE numbers based on selected city
        const filteredRoutes = filters.city.length > 0
            ? routeData.filter(route => filters.city.includes(route.city))
            : routeData;

        const dcCodes = [...new Set(filteredRoutes.map(route => route.dc_code))].sort();

        // Get FE numbers based on selected city and DC
        const feFilteredRoutes = filters.dcCode.length > 0
            ? filteredRoutes.filter(route => filters.dcCode.includes(route.dc_code))
            : filteredRoutes;

        const feNumbers = [...new Set(feFilteredRoutes.map(route => route.fe_number))].sort();

        // Get dates based on selected city, DC, and FE
        const dateFilteredRoutes = filters.feNumber.length > 0
            ? feFilteredRoutes.filter(route => filters.feNumber.includes(route.fe_number))
            : feFilteredRoutes;

        const dates = [...new Set(dateFilteredRoutes.map(route => route.date))].sort();

        return { cities, dcCodes, feNumbers, dates };
    }, [routeData, filters.city, filters.dcCode, filters.feNumber]);

    const filteredData = React.useMemo(() => {
        return routeData.filter(route => {
            // Check if route distance is within limit
            const routeDistance = parseFloat(route.total_distance);
            if (routeDistance > MAX_ROUTE_DISTANCE) {
                return false;
            }

            // Check if all hexagon coordinates are within city boundaries
            const cityBoundary = getCityBoundary(route.city);
            if (!cityBoundary) {
                return false;
            }

            // Check if all activities in the route are within city boundaries
            const allActivitiesInBounds = route.activities.every(activity => {
                return activity.lat >= cityBoundary.south &&
                    activity.lat <= cityBoundary.north &&
                    activity.lng >= cityBoundary.west &&
                    activity.lng <= cityBoundary.east;
            });

            if (!allActivitiesInBounds) {
                return false;
            }

            // Apply user filters
            return (
                (filters.city.length === 0 || filters.city.includes(route.city)) &&
                (filters.dcCode.length === 0 || filters.dcCode.includes(route.dc_code)) &&
                (filters.feNumber.length === 0 || filters.feNumber.includes(route.fe_number)) &&
                (filters.date.length === 0 || filters.date.includes(route.date))
            );
        });
    }, [routeData, filters]);

    const metrics = React.useMemo(() => {
        return calculateAverages(filteredData);
    }, [filteredData]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box display="flex" gap={3}>
                <Box flex="0 0 25%">
                    <Paper>
                        <Box p={2}>
                            <Typography variant="h6" gutterBottom>Filters</Typography>
                            <FilterPanel
                                filterOptions={filterOptions}
                                filters={filters}
                                setFilters={setFilters}
                            />
                        </Box>
                    </Paper>
                </Box>

                <Box flex="1">
                    <Paper sx={{ mb: 3 }}>
                        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                            <Tab label="Analytics" />
                            <Tab label="Simulation 1" />
                            <Tab label="Simulation 2" />
                        </Tabs>
                    </Paper>

                    {activeTab === 0 ? (
                        <Box display="flex" flexDirection="column" gap={3}>
                            <Paper>
                                <Box p={2}>
                                    <Typography variant="h6" gutterBottom>Average Distance Metrics</Typography>
                                    <DistanceMetrics metrics={metrics} />
                                </Box>
                            </Paper>

                            <Paper>
                                <Box p={2} height="60vh">
                                    <Typography variant="h6" gutterBottom>Route Map</Typography>
                                    <HexagonMap
                                        locationData={locationData}
                                        filteredRoutes={filteredData}
                                    />
                                </Box>
                            </Paper>

                            <Paper>
                                <Box p={2}>
                                    <Typography variant="h6" gutterBottom>Distance Analysis</Typography>
                                    <DistanceChart data={filteredData} />
                                </Box>
                            </Paper>
                        </Box>
                    ) : (
                        <Box display="flex" flexDirection="column" gap={3}>
                            <Paper>
                                <Box p={2} height="60vh">
                                    <Typography variant="h6" gutterBottom>Route Map</Typography>
                                    <HexagonMap
                                        locationData={locationData}
                                        filteredRoutes={filteredData}
                                    />
                                </Box>
                            </Paper>

                            <Paper>
                                <SimulationPanel 
                                    routeData={filteredData} 
                                    simulationType={activeTab === 1 ? 'dc-to-hc' : 'hc-to-hc'}
                                />
                            </Paper>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default Dashboard;