import React, { useState } from 'react';
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";
import { FiShare2 } from "react-icons/fi";
import { FaRegHeart } from "react-icons/fa";
import { MdOutlineArrowOutward } from "react-icons/md";
import { FaCircleArrowDown } from "react-icons/fa6";
import carimage from '../assets/images/carannonceimage.png'




function VehicleSection() {
  const [activeTab, setActiveTab] = useState('all');
  const [savedVehicles, setSavedVehicles] = useState({});

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };


  // Sample vehicle data
  const vehicles = [
    { id: 1, name: 'Peugeot 208', specs: '1.2 PureTech Allure Euro 6 (s/s) 5dr', price: '180 000 MAD', isNew: true },
    { id: 2, name: 'Peugeot 208', specs: '1.2 PureTech Allure Euro 6 (s/s) 5dr', price: '180 000 MAD', isNew: true },
    { id: 3, name: 'Peugeot 208', specs: '1.2 PureTech Allure Euro 6 (s/s) 5dr', price: '180 000 MAD', isNew: true },
    { id: 4, name: 'Peugeot 208', specs: '1.2 PureTech Allure Euro 6 (s/s) 5dr', price: '180 000 MAD', isNew: true },
    { id: 5, name: 'Peugeot 208', specs: '1.2 PureTech Allure Euro 6 (s/s) 5dr', price: '180 000 MAD', isNew: true },
    { id: 6, name: 'Peugeot 208', specs: '1.2 PureTech Allure Euro 6 (s/s) 5dr', price: '180 000 MAD', isNew: true },
    { id: 7, name: 'Peugeot 208', specs: '1.2 PureTech Allure Euro 6 (s/s) 5dr', price: '180 000 MAD', isNew: true },
    { id: 8, name: 'Peugeot 208', specs: '1.2 PureTech Allure Euro 6 (s/s) 5dr', price: '180 000 MAD', isNew: true },
  ];

  return (
    <section className="container py-5">
      <div className="mb-4">
        <h1 className="fw-bold mb-4">Explore All Vehicles</h1>
        
        {/* Tabs */}
        <div className="d-flex flex-wrap gap-2 mb-4">
          <button 
            className={`btn rounded-pill px-4 py-2 ${activeTab === 'all' ? 'btn-warning' : 'btn-light'}`}
            onClick={() => handleTabClick('all')}
          >
            All
          </button>
          <button 
            className={`btn rounded-pill px-4 py-2 ${activeTab === 'recommended' ? 'btn-warning' : 'btn-light'}`}
            onClick={() => handleTabClick('recommended')}
          >
            Recommended for you
          </button>
          <button 
            className={`btn rounded-pill px-4 py-2 ${activeTab === 'recent' ? 'btn-warning' : 'btn-light'}`}
            onClick={() => handleTabClick('recent')}
          >
            Recent Cars
          </button>
          <button 
            className={`btn rounded-pill px-4 py-2 ${activeTab === 'popular' ? 'btn-warning' : 'btn-light'}`}
            onClick={() => handleTabClick('popular')}
          >
            Popular Cars
          </button>
          <button 
            className="btn btn-light rounded-pill px-4 py-2"
          >
            ...
          </button>
        </div>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4"  >

        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="col">
            <div className="card h-100 rounded-4 border-0  position-relative" style={{boxShadow : '0px 5px 4px 0px #57575787'}} >
              {vehicle.isNew && (
                <span className="position-absolute  top-1 start-0  text-white px-2 py-1 m-2 rounded-pill" style={{backgroundColor : '#367209'  ,  fontWeight : '600' , fontSize : '12px'}}>
                  New
                </span>
              )}
              
              {/* Vehicle Image */}
              <img 
                src={carimage}
                className="card-img-top p-3" 
                alt={vehicle.name} 
              />

<hr className="m-0 mt-3" />

              
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h5 className="card-title fw-bold mb-1">{vehicle.name}</h5>
                    <p className="card-text text-muted small mb-0">{vehicle.specs}</p>
                  </div>
                  <div className="d-flex">
                    <button className="btn btn-light btn-sm p-1">

                      <FaRegHeart className="text-muted" />
                    </button>
                    <button className="btn btn-light btn-sm p-1 ms-1">
                      <FiShare2 className="text-muted" />
                    </button>
                  </div>
                </div>
                <hr className="my-2" />
                <div className="d-flex justify-content-between">
                  <span className="fw-bold">{vehicle.price}</span>
                  <a href="#" className=" text-decoration-none small d-flex align-items-center mt-2" style={{color : "#BC7328"}} >
                    View Details
                    
                    <MdOutlineArrowOutward />

                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>



      <div style={{display : 'flex' , alignItems :'center', width: '100%' , paddingTop :'50px'}}  >

      <FaCircleArrowDown  style={{ margin :'auto' , fontSize : '60px', color : "#ffc107",  marginBottom : '30px'}}/>

      </div>

    </section>
  );
}

export default VehicleSection;