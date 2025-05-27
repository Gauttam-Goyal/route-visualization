import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    TooltipProps
} from 'recharts';
import { Box, Paper, Tab, Tabs, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { RouteData, LocationData } from '../../types';

interface DistanceChartProps {
    data: RouteData[];
    locationData: LocationData;
}

interface ChartDataPoint {
    name: string;
    displayName: string;
    avgDistance: number;
    totalRoutes: number;
}

interface CustomTooltipProps extends TooltipProps<number, string> {
    active?: boolean;
    payload?: Array<{
        payload: ChartDataPoint;
    }>;
    label?: string;
}

interface DistanceStats {
    range: string;
    totalShipments: number;
    completedShipments: number;
    rtoPercentage: number;
}

const DistanceChart: React.FC<DistanceChartProps> = ({ data, locationData }) => {
    const [tabIndex, setTabIndex] = React.useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    // Calculate distance-based order completion statistics
    const distanceStats = React.useMemo(() => {
        const ranges = [
            { min: 0, max: 1000, label: '< 1km' },
            { min: 1000, max: 2000, label: '1-2km' },
            { min: 2000, max: 3000, label: '2-3km' },
            { min: 3000, max: 4000, label: '3-4km' },
            { min: 4000, max: 5000, label: '4-5km' },
            { min: 5000, max: 6000, label: '5-6km' },
            { min: 6000, max: 7000, label: '6-7km' },
            { min: 7000, max: Infinity, label: '> 7km' }
        ];

        const stats: DistanceStats[] = ranges.map(range => {
            let totalShipments = 0;
            let totalRtoPercentage = 0;
            let shipmentCount = 0;

            data.forEach(route => {
                route.activities.forEach(activity => {
                    if (activity.type === 'delivery' && activity.distance_from_dc) {
                        const distance = activity.distance_from_dc;
                        if (distance >= range.min && distance < range.max) {
                            // Find shipment count for this hexagon
                            const hexagonMapping = locationData.hexagonCustomerMapping.find(mapping => 
                                String(mapping.hexagon_index) === String(activity.hexagon_index) &&
                                mapping.fe_number === route.fe_number &&
                                mapping.ofd_date === route.date
                            );
                            const currentShipments = hexagonMapping?.delivery_count || 0;
                            totalShipments += currentShipments;
                            
                            // Calculate RTO percentage
                            const rtoPercentage = hexagonMapping?.rto_percentage || 0;
                            totalRtoPercentage += rtoPercentage * currentShipments;
                            shipmentCount += currentShipments;
                        }
                    }
                });
            });

            return {
                range: range.label,
                totalShipments,
                completedShipments: totalShipments,
                rtoPercentage: shipmentCount > 0 ? totalRtoPercentage / shipmentCount : 0
            };
        });

        return stats;
    }, [data, locationData]);

    // Prepare data for DC comparison chart
    const dcChartData = React.useMemo(() => {
        const dcMap = new Map<string, { count: number, totalDistance: number }>();

        data.forEach((route: RouteData) => {
            const existing = dcMap.get(route.dc_code) || { count: 0, totalDistance: 0 };
            dcMap.set(route.dc_code, {
                count: existing.count + 1,
                totalDistance: existing.totalDistance + parseInt(route.total_distance)
            });
        });

        return Array.from(dcMap.entries()).map(([dc, stats]) => ({
            name: dc,
            displayName: `DC ${dc}`,
            avgDistance: Math.round(stats.totalDistance / stats.count),
            totalRoutes: stats.count
        })).sort((a, b) => b.avgDistance - a.avgDistance);
    }, [data]);

    // Prepare data for FE comparison chart
    const feChartData = React.useMemo(() => {
        const feMap = new Map<string, { count: number, totalDistance: number }>();

        data.forEach((route: RouteData) => {
            const existing = feMap.get(route.fe_number) || { count: 0, totalDistance: 0 };
            feMap.set(route.fe_number, {
                count: existing.count + 1,
                totalDistance: existing.totalDistance + parseInt(route.total_distance)
            });
        });

        return Array.from(feMap.entries())
            .map(([fe, stats], index) => ({
                name: fe,
                displayName: `FE ${index + 1}`,
                avgDistance: Math.round(stats.totalDistance / stats.count),
                totalRoutes: stats.count
            }))
            .sort((a, b) => b.avgDistance - a.avgDistance);
    }, [data]);

    const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <Box sx={{ 
                    backgroundColor: 'white', 
                    padding: '10px', 
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }}>
                    <Typography variant="body2">
                        <strong>{data.name}</strong><br />
                        Average Distance: {data.avgDistance.toLocaleString()} m<br />
                        Total Routes: {data.totalRoutes}
                    </Typography>
                </Box>
            );
        }
        return null;
    };

    return (
        <Box>
            <Paper square>
                <Tabs
                    value={tabIndex}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                    aria-label="distance chart tabs"
                >
                    <Tab 
                        label={`By Distribution Center (${dcChartData.length})`}
                        id="tab-0"
                        aria-controls="tabpanel-0"
                    />
                    <Tab 
                        label={`By Field Executive (${feChartData.length})`}
                        id="tab-1"
                        aria-controls="tabpanel-1"
                    />
                </Tabs>
            </Paper>

            <Box height="400px" mt={2}>
                <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                        switch (tabIndex) {
                            case 0:
                                return (
                                    <BarChart 
                                        data={dcChartData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="displayName" 
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                            interval={0}
                                        />
                                        <YAxis 
                                            label={{ 
                                                value: 'Average Distance (m)', 
                                                angle: -90, 
                                                position: 'insideLeft',
                                                style: { textAnchor: 'middle' }
                                            }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar 
                                            dataKey="avgDistance" 
                                            name="Average Distance" 
                                            fill="#2196f3"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                );
                            case 1:
                                return (
                                    <BarChart 
                                        data={feChartData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="displayName" 
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                            interval={0}
                                        />
                                        <YAxis 
                                            label={{ 
                                                value: 'Average Distance (m)', 
                                                angle: -90, 
                                                position: 'insideLeft',
                                                style: { textAnchor: 'middle' }
                                            }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar 
                                            dataKey="avgDistance" 
                                            name="Average Distance" 
                                            fill="#ff9800"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                );
                            default:
                                return (
                                    <BarChart 
                                        data={dcChartData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="displayName" 
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                            interval={0}
                                        />
                                        <YAxis 
                                            label={{ 
                                                value: 'Average Distance (m)', 
                                                angle: -90, 
                                                position: 'insideLeft',
                                                style: { textAnchor: 'middle' }
                                            }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                        <Bar 
                                            dataKey="avgDistance" 
                                            name="Average Distance" 
                                            fill="#2196f3"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                );
                        }
                    })()}
                </ResponsiveContainer>
            </Box>

            {/* Order Completion Statistics Table */}
            <Box mt={4}>
                <Typography variant="h6" gutterBottom>Order Statistics by Distance</Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Distance Range</TableCell>
                                <TableCell align="right">Total Shipments</TableCell>
                                <TableCell align="right">Completed Shipments</TableCell>
                                <TableCell align="right">RTO Percentage (%)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {distanceStats.map((stat) => (
                                <TableRow key={stat.range}>
                                    <TableCell component="th" scope="row">
                                        {stat.range}
                                    </TableCell>
                                    <TableCell align="right">{stat.totalShipments}</TableCell>
                                    <TableCell align="right">{stat.completedShipments}</TableCell>
                                    <TableCell align="right">{stat.rtoPercentage.toFixed(2)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default DistanceChart;