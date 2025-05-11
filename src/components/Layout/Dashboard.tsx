import React from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import FilterPanel from '../Filters/FilterPanel';
import HexagonMap from '../Map/HexagonMap';
import DistanceMetrics from '../Analytics/DistanceMetrics';
import DistanceChart from '../Analytics/DistanceChart';
import { RouteData, LocationData, Filters } from '../../types';
import { calculateAverages } from '../../utils/calculations';

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
    const filteredData = React.useMemo(() => {
        return routeData.filter(route => {
            return (
                (filters.city.length === 0 || filters.city.includes(route.city)) &&
                (filters.dcCode.length === 0 || filters.dcCode.includes(route.dc_code)) &&
                (filters.feNumber.length === 0 || filters.feNumber.includes(route.fe_number))
                // Date filtering would be implemented here
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
                                routeData={routeData}
                                filters={filters}
                                setFilters={setFilters}
                            />
                        </Box>
                    </Paper>
                </Box>

                <Box flex="1">
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
                </Box>
            </Box>
        </Box>
    );
};

export default Dashboard;