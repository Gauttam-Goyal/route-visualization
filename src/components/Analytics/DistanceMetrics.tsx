import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { DistanceMetrics as Metrics } from '../../types';

interface DistanceMetricsProps {
    metrics: Metrics;
}

const DistanceMetrics: React.FC<DistanceMetricsProps> = ({ metrics }) => {
    const formatDistance = (distance: number) => {
        return `${distance.toFixed(2)} m`;
    };

    return (
        <Box display="flex" gap={2}>
            <Box flex="1">
                <Card raised>
                    <CardContent>
                        <Typography variant="h6" color="primary" gutterBottom>
                            City Average
                        </Typography>
                        <Typography variant="h4">
                            {metrics.cityAverage ? formatDistance(metrics.cityAverage) : 'N/A'}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            <Box flex="1">
                <Card raised>
                    <CardContent>
                        <Typography variant="h6" color="primary" gutterBottom>
                            DC Average
                        </Typography>
                        <Typography variant="h4">
                            {metrics.dcAverage ? formatDistance(metrics.dcAverage) : 'N/A'}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            <Box flex="1">
                <Card raised>
                    <CardContent>
                        <Typography variant="h6" color="primary" gutterBottom>
                            FE Average
                        </Typography>
                        <Typography variant="h4">
                            {metrics.feAverage ? formatDistance(metrics.feAverage) : 'N/A'}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default DistanceMetrics;