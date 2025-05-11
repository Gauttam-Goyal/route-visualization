import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { RouteData } from '../../types';

interface DistanceChartProps {
    data: RouteData[];
}

const DistanceChart: React.FC<DistanceChartProps> = ({ data }) => {
    const [tabIndex, setTabIndex] = React.useState(0);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    // Prepare data for DC comparison chart
    const dcChartData = React.useMemo(() => {
        const dcMap = new Map<string, { count: number, totalDistance: number }>();

        data.forEach(route => {
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

        data.forEach(route => {
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

    const CustomTooltip = ({ active, payload, label }: any) => {
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
                    centered
                >
                    <Tab label={`By Distribution Center (${dcChartData.length})`} />
                    <Tab label={`By Field Executive (${feChartData.length})`} />
                </Tabs>
            </Paper>

            <Box height="400px" mt={2}>
                <ResponsiveContainer width="100%" height="100%">
                    {tabIndex === 0 ? (
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
                    ) : (
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
                    )}
                </ResponsiveContainer>
            </Box>
        </Box>
    );
};

export default DistanceChart;