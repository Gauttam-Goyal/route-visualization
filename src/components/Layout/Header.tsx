import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    return (
        <AppBar position="static">
            <Toolbar>
                <Button 
                    color="inherit" 
                    onClick={onMenuClick}
                    sx={{ mr: 2 }}
                >
                    Menu
                </Button>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Route Visualization Dashboard
                </Typography>
            </Toolbar>
        </AppBar>
    );
};

export default Header;