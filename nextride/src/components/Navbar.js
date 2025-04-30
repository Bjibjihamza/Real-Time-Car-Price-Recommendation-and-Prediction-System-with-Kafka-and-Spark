import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { CiHeart } from "react-icons/ci";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AppBar position="static" sx={{ backgroundColor: 'transparent' , padding: '25px' }}> {/* Dark background */}
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 2, md: 6 } }}>
        {/* Logo */}
        <Typography 
          variant="h5" 
          sx={{ 
            color: '#FFFFFF', 
            fontWeight: '400', 
            fontSize: '32px', 
            fontFamily: 'Gasoek One, sans-serif' // Apply Gasoek One font
          }}
        >
          NextRide
        </Typography>

        <Box sx={{display : "flex" , justifyContent : 'space-between'}} >

          {/* Desktop Menu */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3  , marginRight:'100px'}}>
            <Button sx={{ color: 'white', textTransform: 'none'  , fontSize : '18px' , fontWeight : '600'}}><Link className="nav-link" to="/">Home</Link></Button>
            
            <Button sx={{ color: 'white', textTransform: 'none'  , fontSize : '18px' , fontWeight : '600' }}><Link className="nav-link" to="/predict">Price Prediction</Link>
            </Button>
            <Button sx={{ color: 'white', textTransform: 'none'  , fontSize : '18px'   , fontWeight : '600'}}>                <Link className="nav-link" to="/profile">My Profile</Link>
            </Button>
            <Button sx={{ color: 'white', textTransform: 'none'  , fontSize : '18px'  , fontWeight : '600' }}>                 <Link className="nav-link" to="/"> Contact us</Link>
            </Button>
          </Box>

                          
                          

          {/* Right Side: Sign in/up and Hamburger */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button sx={{ color: 'white', textTransform: 'none', fontSize : '18px' , fontWeight : '700', display: { xs: 'none', md: 'block' } }}>
            <Link to="/login" className='text-decoration-none text-light'>Sign In</Link>
            </Button>
            <Button
              variant="contained"
              sx={{
                backgroundColor: '#d97706', // Mustard yellow
                color: 'white',
                borderRadius: '9999px', // Fully rounded
                px: 3,
                pt :1,
                pb :1,
                textTransform: 'none',
                display: { xs: 'none', md: 'block' },
                '&:hover': { backgroundColor: '#b45309' }, // Darker yellow on hover
                fontSize : '17px' ,
                fontWeight : '700'
              }}
            >
              <Link to="/signup" className='text-decoration-none  text-light' >Sign Up</Link>
            </Button>

            <IconButton
              sx={{ color: 'white', display: { xs: 'block', md: 'none' } }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MenuIcon />
            </IconButton>
          </Box>

        </Box>

      </Toolbar>

      {/* Mobile Menu */}
      {menuOpen && (
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', backgroundColor: '#1f2937', p: 2, gap: 1 }}>
          <Button sx={{ color: 'white', textTransform: 'none' }}>Home</Button>
          <Button sx={{ color: 'white', textTransform: 'none' }}>Price Prediction</Button>
          <Button sx={{ color: 'white', textTransform: 'none' }}>My profile</Button>
          <Button sx={{ color: 'white', textTransform: 'none' }}>Contact us</Button>
          <Button sx={{ color: 'white', textTransform: 'none' }}>Sign in</Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: '#d97706',
              color: 'white',
              borderRadius: '9999px',
              px: 3,
              textTransform: 'none',
              '&:hover': { backgroundColor: '#b45309' },
            }}
          >
            Sign up
          </Button>

        </Box>
        
      )}
    </AppBar>
  );
}

export default Navbar;
