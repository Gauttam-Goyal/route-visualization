import React, { useEffect, useState } from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Box,
    Checkbox,
    ListItemText,
    SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Filters, RouteData } from '../../types';

interface FilterPanelProps {
    routeData: RouteData[];
    filters: Filters;
    setFilters: (filters: Filters) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ routeData, filters, setFilters }) => {
    const [cities, setCities] = useState<string[]>([]);
    const [dcCodes, setDcCodes] = useState<string[]>([]);
    const [feNumbers, setFeNumbers] = useState<string[]>([]);

    useEffect(() => {
        // Extract unique values
        const uniqueCities = [...new Set(routeData.map(route => route.city))];
        const uniqueDcCodes = [...new Set(routeData.map(route => route.dc_code))];
        const uniqueFeNumbers = [...new Set(routeData.map(route => route.fe_number))];

        setCities(uniqueCities.sort());
        setDcCodes(uniqueDcCodes.sort());
        setFeNumbers(uniqueFeNumbers.sort());
    }, [routeData]);

    // Filter DC codes based on selected city
    const filteredDcCodes = React.useMemo(() => {
        if (!filters.city.length) return dcCodes;
        return [...new Set(routeData
            .filter(route => filters.city.includes(route.city))
            .map(route => route.dc_code))]
            .sort();
    }, [dcCodes, filters.city, routeData]);

    // Filter FE numbers based on selected DC code
    const filteredFeNumbers = React.useMemo(() => {
        if (!filters.dcCode.length) return feNumbers;
        return [...new Set(routeData
            .filter(route => filters.dcCode.includes(route.dc_code))
            .map(route => route.fe_number))]
            .sort();
    }, [feNumbers, filters.dcCode, routeData]);

    const handleCityChange = (event: SelectChangeEvent<string[]>) => {
        const city = event.target.value as string[];
        setFilters({
            ...filters,
            city,
            // Reset DC and FE when city changes
            dcCode: [],
            feNumber: []
        });
    };

    const handleDcCodeChange = (event: SelectChangeEvent<string[]>) => {
        const dcCode = event.target.value as string[];
        setFilters({
            ...filters,
            dcCode,
            // Reset FE when DC changes
            feNumber: []
        });
    };

    const handleFeNumberChange = (event: SelectChangeEvent<string[]>) => {
        setFilters({
            ...filters,
            feNumber: event.target.value as string[]
        });
    };

    const handleReset = () => {
        setFilters({
            city: [],
            dcCode: [],
            feNumber: [],
            dateRange: [null, null]
        });
    };

    return (
        <Box sx={{ width: '100%', maxWidth: '300px' }}>
            <FormControl fullWidth margin="normal" size="small">
                <InputLabel>City</InputLabel>
                <Select
                    multiple
                    value={filters.city}
                    label="City"
                    onChange={handleCityChange}
                    renderValue={(selected) => (selected as string[]).join(', ')}
                >
                    {cities.map(city => (
                        <MenuItem key={city} value={city}>
                            <Checkbox checked={filters.city.indexOf(city) > -1} />
                            <ListItemText primary={city} />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" size="small">
                <InputLabel>DC Code</InputLabel>
                <Select
                    multiple
                    value={filters.dcCode}
                    label="DC Code"
                    onChange={handleDcCodeChange}
                    renderValue={(selected) => (selected as string[]).join(', ')}
                    disabled={filteredDcCodes.length === 0}
                >
                    {filteredDcCodes.map(dc => (
                        <MenuItem key={dc} value={dc}>
                            <Checkbox checked={filters.dcCode.indexOf(dc) > -1} />
                            <ListItemText primary={dc} />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Field Executive</InputLabel>
                <Select
                    multiple
                    value={filters.feNumber}
                    label="Field Executive"
                    onChange={handleFeNumberChange}
                    renderValue={(selected) => {
                        const selectedFEs = selected as string[];
                        if (selectedFEs.length === 0) return '';
                        if (selectedFEs.length === 1) return selectedFEs[0];
                        return `${selectedFEs.length} FEs selected`;
                    }}
                    disabled={filteredFeNumbers.length === 0}
                >
                    {filteredFeNumbers.map(fe => (
                        <MenuItem key={fe} value={fe}>
                            <Checkbox checked={filters.feNumber.indexOf(fe) > -1} />
                            <ListItemText 
                                primary={fe}
                                primaryTypographyProps={{
                                    style: {
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }
                                }}
                            />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Box mt={2} display="flex" justifyContent="center">
                <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleReset}
                    size="small"
                >
                    Reset Filters
                </Button>
            </Box>
        </Box>
    );
};

export default FilterPanel;