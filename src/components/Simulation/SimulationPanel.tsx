import React, { useState } from 'react';
import { Box, Paper, Typography, Button, TextField } from '@mui/material';
import { RouteData } from '../../types';

interface Activity {
    sequence: number;
    type: 'depot' | 'delivery';
    distance_from_prev?: number;
}

interface SimulationPanelProps {
    routeData: RouteData[];
    simulationType: 'dc-to-hc' | 'hc-to-hc';
}

interface SimulationParams {
    distanceThreshold: number;
    incentiveFixed: number;
    incentiveVariable: number;
    preBaseRate: number;
    postBaseRate: number;
    conversionPercentage: number;
}

interface PayoutValues {
    cityLevel: { pre: number; post: number };
    dcLevel: { pre: number; post: number };
    feLevel: { pre: number; post: number };
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ routeData, simulationType }) => {
    const [simulationParams, setSimulationParams] = useState<SimulationParams>({
        distanceThreshold: simulationType === 'dc-to-hc' ? 1 : 1,
        incentiveFixed: 5,
        incentiveVariable: 1,
        preBaseRate: 14,
        postBaseRate: 13,
        conversionPercentage: 100
    });

    const [feLevelPayouts, setFeLevelPayouts] = useState<PayoutValues>({
        cityLevel: { pre: 0, post: 0 },
        dcLevel: { pre: 0, post: 0 },
        feLevel: { pre: 0, post: 0 }
    });

    const [orderLevelPayouts, setOrderLevelPayouts] = useState<PayoutValues>({
        cityLevel: { pre: 0, post: 0 },
        dcLevel: { pre: 0, post: 0 },
        feLevel: { pre: 0, post: 0 }
    });

    const handleParamChange = (param: keyof SimulationParams) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            setSimulationParams(prev => ({
                ...prev,
                [param]: value
            }));
        }
    };

    const calculatePayouts = (level: 'cityLevel' | 'dcLevel' | 'feLevel', type: 'feLevel' | 'orderLevel') => {
        const { preBaseRate, postBaseRate, incentiveFixed, incentiveVariable, conversionPercentage, distanceThreshold } = simulationParams;
        
        // Calculate total distance for the selected level
        const totalDistance = routeData.reduce((sum, route) => {
            try {
                const activities = route.activities as Activity[];
                
                if (level === 'cityLevel') {
                    return sum + parseFloat(route.total_distance);
                }
                
                // For DC and FE level, we need to calculate distances from activities
                let distance = 0;
                if (level === 'dcLevel') {
                    // DC to HC distance is the first delivery activity's distance
                    const firstDelivery = activities.find(a => a.type === 'delivery');
                    if (firstDelivery && firstDelivery.distance_from_prev) {
                        distance = firstDelivery.distance_from_prev;
                    }
                } else {
                    // FE level is the sum of all delivery distances
                    distance = activities
                        .filter(a => a.type === 'delivery')
                        .reduce((sum: number, a: Activity) => sum + (a.distance_from_prev || 0), 0);
                }
                return sum + distance;
            } catch (error) {
                console.error('Error processing route data:', error);
                return sum;
            }
        }, 0);

        // Calculate number of orders (delivery activities)
        const totalOrders = routeData.reduce((sum, route) => {
            try {
                const activities = route.activities as Activity[];
                const deliveryActivities = activities.filter(a => a.type === 'delivery');
                return sum + deliveryActivities.length;
            } catch (error) {
                console.error('Error processing route data:', error);
                return sum;
            }
        }, 0);

        // Number of FEs (each route represents one FE)
        const numberOfFEs = routeData.length;

        let prePayout: number;
        let postPayout: number;

        if (level === 'feLevel') {
            // Calculate for each FE and then average
            const totalFePayouts = routeData.reduce((sum, route) => {
                try {
                    const activities = route.activities as Activity[];
                    const deliveryActivities = activities.filter(a => a.type === 'delivery');
                    
                    // Calculate number of orders based on simulation type
                    let numberOfOrders: number;
                    let distanceAboveThreshold: number = 0;
                    
                    if (simulationType === 'dc-to-hc') {
                        // For DC-to-HC, total orders is 1
                        numberOfOrders = 1;
                        // Get the depot to delivery distance from the first delivery activity
                        const firstDeliveryActivity = activities.find(a => a.type === 'delivery');
                        console.log('First delivery activity:', JSON.stringify(firstDeliveryActivity, null, 2));
                        const depotDistance = (firstDeliveryActivity?.distance_from_prev || 0) / 1000;
                        console.log('Depot distance:', depotDistance);
                        distanceAboveThreshold = Math.floor(Math.max(0, depotDistance - distanceThreshold));
                    } else {
                        // For HC-to-HC, total orders is all delivery activities
                        numberOfOrders = activities.filter(a => a.type === 'delivery').length;
                        // Calculate distance above threshold for each delivery
                        distanceAboveThreshold = deliveryActivities.reduce((sum, a, index) => {
                            // Get distance from next activity's distance_from_prev
                            const nextActivity = activities[index + 1];
                            const distance = (nextActivity?.distance_from_prev || 0) / 1000;
                            return sum + Math.floor(Math.max(0, distance - distanceThreshold));
                        }, 0);
                    }
                    
                    // Calculate pre-payout: number of orders * pre base rate
                    // const fePrePayout = numberOfOrders * preBaseRate;
                    
                    // Calculate post-payout: (number of orders * post base rate) + 
                    // (distance above threshold * fixed incentive * variable incentive * conversion rate / 100)
                    console.log("Distance above threshold:", distanceAboveThreshold)
                    console.log("Incentive fixed:", incentiveFixed)
                    console.log("Incentive variable:", incentiveVariable)
                    console.log("Conversion percentage:", conversionPercentage)
                    const fePostPayout = (numberOfOrders * postBaseRate) + 
                        (distanceAboveThreshold * incentiveFixed * incentiveVariable * (conversionPercentage / 100));
                    
                    console.log("Post payout:", fePostPayout)
                    console.log('Distance above threshold:', distanceAboveThreshold, 'for FE with orders:', numberOfOrders);
                    
                    return sum + fePostPayout;
                } catch (error) {
                    console.error('Error calculating FE payout:', error);
                    return sum;
                }
            }, 0);

            postPayout = totalFePayouts / numberOfFEs;

            // Pre payout calculation using same distance logic but without thresholds and incentives
            const totalFePrePayouts = routeData.reduce((sum, route) => {
                try {
                    const activities = route.activities as Activity[];
                    const deliveryActivities = activities.filter(a => a.type === 'delivery');
                    const numberOfOrders = simulationType === 'dc-to-hc' ? 1 : deliveryActivities.length;
                    
                    let feDistance: number;

                    if (simulationType === 'dc-to-hc') {
                        // Simulation 1: Use depot distance
                        const depotActivity = activities.find(a => a.type === 'depot');
                        feDistance = depotActivity?.distance_from_prev || 0;
                    } else {
                        // Simulation 2: Use sum of all delivery distances
                        feDistance = deliveryActivities.reduce((sum, a) => sum + (a.distance_from_prev || 0), 0);
                    }
                    
                    // Calculate FE pre payout - base rate * number of orders
                    const fePrePayout = (preBaseRate * numberOfOrders);
                    
                    return sum + fePrePayout;
                } catch (error) {
                    console.error('Error calculating FE pre payout:', error);
                    return sum;
                }
            }, 0);

            prePayout = totalFePrePayouts / numberOfFEs;
        } else {
            // City and DC level calculations remain the same
            prePayout = (preBaseRate * totalOrders) + (incentiveFixed * totalDistance);
            postPayout = (postBaseRate * totalOrders) + (incentiveFixed * totalDistance) + 
                        (incentiveVariable * totalDistance * (conversionPercentage / 100));
        }

        if (type === 'feLevel') {
            setFeLevelPayouts(prev => ({
                ...prev,
                [level]: { pre: prePayout, post: postPayout }
            }));
        } else {
            // For order level, divide by total orders
            setOrderLevelPayouts(prev => ({
                ...prev,
                [level]: { 
                    pre: prePayout / totalOrders, 
                    post: postPayout / totalOrders 
                }
            }));
        }
    };

    return (
        <Box p={2}>
            <Typography variant="h6" gutterBottom>
                {simulationType === 'dc-to-hc' ? 'DC to HC Simulation' : 'HC to HC Simulation'}
            </Typography>

            <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>Parameters</Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2}>
                        <TextField
                            label="Distance Threshold (km)"
                            type="number"
                            value={simulationParams.distanceThreshold}
                            onChange={handleParamChange('distanceThreshold')}
                            InputProps={{ inputProps: { min: 0, step: "0.1" } }}
                        />
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Incentive per km (₹)</Typography>
                            <Box display="flex" gap={2}>
                                <TextField
                                    label="Fixed"
                                    type="number"
                                    value={simulationParams.incentiveFixed}
                                    onChange={handleParamChange('incentiveFixed')}
                                    InputProps={{ inputProps: { min: 0, step: "0.1" } }}
                                    size="small"
                                />
                                <TextField
                                    label="Variable"
                                    type="number"
                                    value={simulationParams.incentiveVariable}
                                    onChange={handleParamChange('incentiveVariable')}
                                    InputProps={{ inputProps: { min: 0, step: "0.1" } }}
                                    size="small"
                                />
                            </Box>
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Base Rate (₹)</Typography>
                            <Box display="flex" gap={2}>
                                <TextField
                                    label="Pre"
                                    type="number"
                                    value={simulationParams.preBaseRate}
                                    onChange={handleParamChange('preBaseRate')}
                                    InputProps={{ inputProps: { min: 0, step: "0.1" } }}
                                    size="small"
                                />
                                <TextField
                                    label="Post"
                                    type="number"
                                    value={simulationParams.postBaseRate}
                                    onChange={handleParamChange('postBaseRate')}
                                    InputProps={{ inputProps: { min: 0, step: "0.1" } }}
                                    size="small"
                                />
                            </Box>
                        </Box>
                        <TextField
                            label="Conversion %"
                            type="number"
                            value={simulationParams.conversionPercentage}
                            onChange={handleParamChange('conversionPercentage')}
                            InputProps={{ inputProps: { min: 0, max: 100, step: "0.1" } }}
                        />
                    </Box>
                </Paper>
            </Box>

            <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>Outputs</Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box display="flex" flexDirection="column" gap={3}>
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>FE Level Total Payout</Typography>
                            <Box display="flex" flexDirection="column" gap={2}>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Typography sx={{ flex: 1 }}>City Level</Typography>
                                    <Box display="flex" gap={2}>
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Pre"
                                            value={feLevelPayouts.cityLevel.pre.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Post"
                                            value={feLevelPayouts.cityLevel.post.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                    </Box>
                                    <Button 
                                        variant="contained" 
                                        size="small"
                                        onClick={() => calculatePayouts('cityLevel', 'feLevel')}
                                    >
                                        Calculate
                                    </Button>
                                </Box>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Typography sx={{ flex: 1 }}>DC Level</Typography>
                                    <Box display="flex" gap={2}>
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Pre"
                                            value={feLevelPayouts.dcLevel.pre.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Post"
                                            value={feLevelPayouts.dcLevel.post.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                    </Box>
                                    <Button 
                                        variant="contained" 
                                        size="small"
                                        onClick={() => calculatePayouts('dcLevel', 'feLevel')}
                                    >
                                        Calculate
                                    </Button>
                                </Box>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Typography sx={{ flex: 1 }}>FE Level</Typography>
                                    <Box display="flex" gap={2}>
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Pre"
                                            value={feLevelPayouts.feLevel.pre.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Post"
                                            value={feLevelPayouts.feLevel.post.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                    </Box>
                                    <Button 
                                        variant="contained" 
                                        size="small"
                                        onClick={() => calculatePayouts('feLevel', 'feLevel')}
                                    >
                                        Calculate
                                    </Button>
                                </Box>
                            </Box>
                        </Box>

                        <Box>
                            <Typography variant="subtitle2" gutterBottom>Order Level Payout</Typography>
                            <Box display="flex" flexDirection="column" gap={2}>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Typography sx={{ flex: 1 }}>City Level</Typography>
                                    <Box display="flex" gap={2}>
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Pre"
                                            value={orderLevelPayouts.cityLevel.pre.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Post"
                                            value={orderLevelPayouts.cityLevel.post.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                    </Box>
                                    <Button 
                                        variant="contained" 
                                        size="small"
                                        onClick={() => calculatePayouts('cityLevel', 'orderLevel')}
                                    >
                                        Calculate
                                    </Button>
                                </Box>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Typography sx={{ flex: 1 }}>DC Level</Typography>
                                    <Box display="flex" gap={2}>
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Pre"
                                            value={orderLevelPayouts.dcLevel.pre.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Post"
                                            value={orderLevelPayouts.dcLevel.post.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                    </Box>
                                    <Button 
                                        variant="contained" 
                                        size="small"
                                        onClick={() => calculatePayouts('dcLevel', 'orderLevel')}
                                    >
                                        Calculate
                                    </Button>
                                </Box>
                                <Box display="flex" alignItems="center" gap={2}>
                                    <Typography sx={{ flex: 1 }}>FE Level</Typography>
                                    <Box display="flex" gap={2}>
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Pre"
                                            value={orderLevelPayouts.feLevel.pre.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                        <TextField
                                            size="small"
                                            disabled
                                            label="Post"
                                            value={orderLevelPayouts.feLevel.post.toFixed(2)}
                                            sx={{ width: '120px' }}
                                        />
                                    </Box>
                                    <Button 
                                        variant="contained" 
                                        size="small"
                                        onClick={() => calculatePayouts('feLevel', 'orderLevel')}
                                    >
                                        Calculate
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Paper>
            </Box>

            <Box display="flex" gap={2}>
                <Button variant="outlined" color="secondary">
                    Reset
                </Button>
            </Box>
        </Box>
    );
};

export default SimulationPanel; 