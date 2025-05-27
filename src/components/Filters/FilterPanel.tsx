import React from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Box,
    Checkbox,
    ListItemText,
    SelectChangeEvent,
    TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Filters, RouteData } from '../../types';

interface FilterPanelProps {
    filters: Filters;
    setFilters: (filters: Filters) => void;
    availableRoutes: RouteData[];
    cities: string[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, setFilters, availableRoutes, cities }) => {
    // Extract unique values for filters
    const filterOptions = React.useMemo(() => {
        // Get DC codes for the selected city
        const filteredRoutes = filters.city.length > 0
            ? availableRoutes.filter(route => route.city.toLowerCase() === filters.city[0].toLowerCase())
            : [];

        const dcCodes = [...new Set(filteredRoutes.map(route => route.dc_code))].sort();

        // Get FE numbers based on selected DCs
        const feFilteredRoutes = filters.dcCode.includes('ALL')
            ? filteredRoutes // If "ALL" is selected, use all routes for the city
            : filters.dcCode.length > 0
                ? filteredRoutes.filter(route => filters.dcCode.includes(route.dc_code))
                : filteredRoutes;

        const feNumbers = [...new Set(feFilteredRoutes.map(route => route.fe_number))].sort();

        // Get dates based on selected city, DC, and FE
        const dateFilteredRoutes = filters.feNumber.length > 0
            ? feFilteredRoutes.filter(route => filters.feNumber.includes(route.fe_number))
            : feFilteredRoutes;

        const dates = [...new Set(dateFilteredRoutes.map(route => route.date))].sort();

        return { dcCodes, feNumbers, dates };
    }, [availableRoutes, filters.city, filters.dcCode, filters.feNumber]);

    const handleCityChange = (event: SelectChangeEvent<string>) => {
        const selectedCity = event.target.value;
        
        setFilters({
            ...filters,
            city: [selectedCity], // Wrap in array to maintain type consistency
            dcCode: [], // Reset DC selection instead of auto-selecting
            feNumber: [] // Reset FE selection
        });
    };

    const handleDcCodeChange = (event: SelectChangeEvent<string[]>) => {
        const selectedValues = event.target.value as string[];

        // If "ALL" is in the current selection but not in the new selection,
        // or if "ALL" is being clicked while already selected, clear all selections
        if ((filters.dcCode.includes('ALL') && !selectedValues.includes('ALL')) ||
            (filters.dcCode.includes('ALL') && selectedValues.includes('ALL'))) {
            setFilters({
                ...filters,
                dcCode: [],
                feNumber: [] // Reset FE when DC changes
            });
            return;
        }

        // If "ALL" is being selected, select all DCs
        if (selectedValues.includes('ALL')) {
            setFilters({
                ...filters,
                dcCode: ['ALL', ...filterOptions.dcCodes],
                feNumber: [] // Reset FE when DC changes
            });
            return;
        }

        // Normal selection of individual DCs
        setFilters({
            ...filters,
            dcCode: selectedValues,
            feNumber: [] // Reset FE when DC changes
        });
    };

    const handleFeNumberChange = (event: SelectChangeEvent<string[]>) => {
        setFilters({
            ...filters,
            feNumber: event.target.value as string[]
        });
    };

    const handleDateChange = (event: SelectChangeEvent<string[]>) => {
        setFilters({
            ...filters,
            date: event.target.value as string[]
        });
    };

    const handleReset = () => {
        setFilters({
            city: [],
            dcCode: [],
            feNumber: [],
            date: [],
            dateRange: [null, null]
        });
    };

    return (
        <Box sx={{ width: '100%', maxWidth: '300px' }}>
            <FormControl fullWidth margin="normal" size="small">
                <InputLabel>City</InputLabel>
                <Select
                    value={filters.city[0] || ''} // Get first (and only) city or empty string
                    label="City"
                    onChange={handleCityChange}
                >
                    {cities.map(city => (
                        <MenuItem key={city} value={city}>
                            {city}
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
                    renderValue={(selected) => {
                        const selectedValues = selected as string[];
                        if (selectedValues.includes('ALL')) return 'All DCs';
                        return selectedValues.join(', ');
                    }}
                    disabled={filterOptions.dcCodes.length === 0}
                >
                    <MenuItem value="ALL">
                        <Checkbox checked={filters.dcCode.includes('ALL')} />
                        <ListItemText primary="Select All" />
                    </MenuItem>
                    {filterOptions.dcCodes.map(dc => (
                        <MenuItem key={dc} value={dc}>
                            <Checkbox checked={filters.dcCode.includes(dc)} />
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
                    disabled={filterOptions.feNumbers.length === 0}
                >
                    {filterOptions.feNumbers.map(fe => (
                        <MenuItem key={fe} value={fe}>
                            <Checkbox checked={filters.feNumber.includes(fe)} />
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

            <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Date</InputLabel>
                <Select
                    multiple
                    value={filters.date || []}
                    label="Date"
                    onChange={handleDateChange}
                    renderValue={(selected) => (selected as string[]).join(', ')}
                    disabled={filterOptions.dates.length === 0}
                >
                    {filterOptions.dates.map(date => (
                        <MenuItem key={date} value={date}>
                            <Checkbox checked={filters.date?.indexOf(date) > -1} />
                            <ListItemText primary={date} />
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