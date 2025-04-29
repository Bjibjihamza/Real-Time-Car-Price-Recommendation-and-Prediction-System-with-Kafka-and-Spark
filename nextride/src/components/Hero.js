import React from 'react';
import BgImage from '../assets/images/bg.jpg'; // Assurez-vous que ce chemin est correct
import car from '../assets/images/bg2.png'; // Assurez-vous que ce chemin est correct
import { CiSearch } from "react-icons/ci";
import icon1 from "../assets/images/icon-1.png"
import icon2 from "../assets/images/icon-2.png"
import icon3 from "../assets/images/icon-3.png"


import Navbar from './Navbar';

function Hero() {
  // Style pour l'arrière-plan
  const heroStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${BgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    height: '90%',
    position: 'relative',
    overflow: 'hidden'
  };

  // Style pour le demi-cercle à gauche
  const semicircleStyle = {
    position: 'absolute',
    width: '70vw', // Dimension relative à la hauteur de l'écran
    height: '120vh', // Dimension relative à la hauteur de l'écran
    right: '-20vw', // Le positionne à moitié hors de l'écran
    top: '50%', // Centre verticalement
    transform: 'translateY(-50%)', // Ajuste le centrage vertical
    borderRadius: '50%', // Cercle complet
    backgroundColor: 'rgba(255, 234, 145, 0.1)', // Couleur jaune transparente
    pointerEvents: 'none', // N'interfère pas avec les clics
    zIndex: 1 // Au-dessus du fond mais sous le contenu
  };

  const carStyle = {
    position: 'absolute',
    bottom: '-12vh',
    right: '0',
    zIndex: '10',
    width: '55vw'
  };

  return (
    <section className="container-fluid p-0 m-0" style={{ height: '100vh' }}>

      <section style={heroStyle}>
        <Navbar />
        {/* Demi-cercle à gauche */}
        <div style={semicircleStyle}></div>

        {/* Contenu du Hero */}
        <div className="row h-100 position-relative" style={{ zIndex: 2 }}>
          <div className="col-md-6 d-flex flex-column justify-content-center ps-4 ps-md-5">
            <h1 className="text-white display-4 w-75 mb-5" style={{ fontSize: '80px', fontWeight: '900' }}>
              FIND YOUR PERFECT CAR !
            </h1>
            <p
              className="lead"
              style={{
                color: '#FFDD67',
                fontWeight: '700',
                width: '30vw',
                marginBottom: '40px'
              }}
            >
              Browse and get personalized car recommendations based on your preferences.
            </p>
            <div
              className="search-bar"
              style={{
                width: '100%',
                display: 'flex',
                alignItems : 'center'
   
              }}
            >
              <input style={{  marginLeft :'10px',width : '50%' , padding :'20px' , borderRadius : '50px' , border : 'none' }} type="text" placeholder="Search ... " className="search-input" />
              <CiSearch style={{color : 'rgba(0, 0, 0, 0.6)' , width : '50px' ,  fontSize : '30px', position : 'relative' , transform:'translate(-60px)'}} />

            </div>
          </div>
        </div>
      </section>

      <div   className='icons' >
      <img src={icon1}   style={{position:'absolute' , top:'25vh' , left : '49vw'}}  />
      <img src={icon2}   style={{position:'absolute' , top:'40vh' , left : '53vw' }} />
      <img src={icon3}  style={{position:'absolute' , top:'55vh' , left : '49vw'}}  />

      </div>






      <img src={car} alt="Car" style={carStyle} />
    </section>
  );
}

export default Hero;
