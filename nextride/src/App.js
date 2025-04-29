import React from 'react';
import Hero from './components/Hero';
import Explore from './components/Explore';
import VehicleSection from './components/VehicleSection';
import CompareSection from './components/CompareSection';
import PromoSection from './components/PromoSection';
import ReviewsSection from './components/ReviewsSection';
import Footer from './components/Footer';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function App() {
  return (
    <div className="w-screen h-screen m-0 p-0">
      <Hero />
      <Explore />
      <VehicleSection />
      <CompareSection />
      <PromoSection />
      <ReviewsSection />
      <Footer />
    </div>
  );
}

export default App;