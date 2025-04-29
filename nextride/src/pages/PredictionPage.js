import React, { useState } from 'react';
import { FaArrowRight, FaCarSide, FaCog, FaRegLightbulb } from 'react-icons/fa';
import { MdCompareArrows } from 'react-icons/md';
import { SiLightningdesignservice } from 'react-icons/si';

const PredictionPage = () => {
  const [selectedModel, setSelectedModel] = useState('lightgbm');
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    condition: '',
    year: '',
    mileage: '',
    fuel_type: '',
    transmission: '',
    fiscal_power: '',
    door_count: '',
    first_owner: false,
    origin: '',
    seller_city: '',
  });
  const [equipment, setEquipment] = useState({
    jantes_aluminium: false,
    alarme: false,
    airbags: false,
    abs: false,
    vitres_electriques: false,
    toit_ouvrant: false,
    camera_recul: false,
    climatisation: false,
    esp: false,
    ordinateur_bord: false,
    radar_recul: false,
    gps: false,
    verrouillage_centralise: false,
  });
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [loading, setLoading] = useState(false);

  const brands = [
    'Audi', 'BMW', 'Citroën', 'Dacia', 'Fiat', 'Ford', 'Honda', 'Hyundai', 
    'Kia', 'Mercedes-Benz', 'Mitsubishi', 'Nissan', 'Opel', 'Peugeot', 
    'Renault', 'Seat', 'Skoda', 'Toyota', 'Volkswagen', 'Volvo'
  ];

  const cities = [
    'Agadir', 'Casablanca', 'Fès', 'Marrakech', 'Meknès', 'Mohammedia', 
    'Oujda', 'Rabat', 'Salé', 'Tanger', 'Tétouan', 'Benguerir', 'El Jadida'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleEquipmentChange = (e) => {
    const { name, checked } = e.target;
    setEquipment({
      ...equipment,
      [name]: checked
    });
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
  };

  const combineEquipment = () => {
    const selectedEquipment = Object.entries(equipment)
      .filter(([_, isSelected]) => isSelected)
      .map(([key, _]) => key.replace('_', ' '))
      .join(', ');
    
    return selectedEquipment;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Prepare data for API call
    const combinedData = {
      ...formData,
      equipment: combineEquipment(),
      model_type: selectedModel
    };

    // Simulate API call with timeout
    setTimeout(() => {
      // Mock response based on the model - in production this would be an actual API call
      const mockPriceCalculation = () => {
        const basePrice = 100000;
        const yearFactor = parseInt(formData.year, 10) * 2000;
        const mileageFactor = -parseInt(formData.mileage, 10) / 100;
        
        let modelFactor = 0;
        switch(selectedModel) {
          case 'lightgbm':
            modelFactor = 1.05;
            break;
          case 'randomforest':
            modelFactor = 0.98;
            break;
          case 'xgboost':
            modelFactor = 1.02;
            break;
          case 'gbm':
            modelFactor = 0.97;
            break;
          case 'neuralnetwork':
            modelFactor = 1.08;
            break;
          default:
            modelFactor = 1;
        }
        
        return Math.round((basePrice + yearFactor + mileageFactor) * modelFactor);
      };

      setPredictedPrice(mockPriceCalculation());
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="container py-5">
      <div className="row mb-5">
        <div className="col">
          <h1 className="fw-bold">Vehicle Price Prediction</h1>
          <p className="text-muted">
            Enter your vehicle details below and get an estimated price based on our advanced ML models
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm rounded-4 mb-4">
            <div className="card-body p-4">
              <h4 className="mb-4 fw-bold">Select Prediction Model</h4>
              
              <div className="d-flex flex-wrap gap-3 mb-4">
                <button 
                  className={`btn rounded-pill px-4 py-2 ${selectedModel === 'lightgbm' ? 'btn-warning' : 'btn-light'}`}
                  onClick={() => handleModelSelect('lightgbm')}
                >
                  LightGBM
                </button>
                <button 
                  className={`btn rounded-pill px-4 py-2 ${selectedModel === 'randomforest' ? 'btn-warning' : 'btn-light'}`}
                  onClick={() => handleModelSelect('randomforest')}
                >
                  Random Forest
                </button>
                <button 
                  className={`btn rounded-pill px-4 py-2 ${selectedModel === 'xgboost' ? 'btn-warning' : 'btn-light'}`}
                  onClick={() => handleModelSelect('xgboost')}
                >
                  XGBoost
                </button>
                <button 
                  className={`btn rounded-pill px-4 py-2 ${selectedModel === 'gbm' ? 'btn-warning' : 'btn-light'}`}
                  onClick={() => handleModelSelect('gbm')}
                >
                  GBM
                </button>
                <button 
                  className={`btn rounded-pill px-4 py-2 ${selectedModel === 'neuralnetwork' ? 'btn-warning' : 'btn-light'}`}
                  onClick={() => handleModelSelect('neuralnetwork')}
                >
                  Neural Network
                </button>
              </div>

              <div className="alert alert-light border rounded-3">
                <div className="d-flex align-items-center">
                  <FaRegLightbulb className="text-warning me-2" size={20} />
                  <div>
                    <strong>Model Info:</strong> {
                      selectedModel === 'lightgbm' ? 'LightGBM is a gradient boosting framework that uses tree-based learning algorithms. Best for overall accuracy.' :
                      selectedModel === 'randomforest' ? 'Random Forest is an ensemble learning method for classification and regression. Great for avoiding overfitting.' :
                      selectedModel === 'xgboost' ? 'XGBoost is an optimized distributed gradient boosting library. Excellent for structured/tabular data.' :
                      selectedModel === 'gbm' ? 'Gradient Boosting Machine builds an ensemble of decision trees in a stage-wise fashion. Good general-purpose model.' :
                      'Neural Network uses deep learning to capture complex patterns in data. Best for discovering non-linear relationships.'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm rounded-4">
              <div className="card-body p-4">
                <h4 className="mb-4 fw-bold">Vehicle Details</h4>
                
                <div className="row g-3">
                  {/* Basic Information */}
                  <div className="col-md-6">
                    <label htmlFor="brand" className="form-label">Brand*</label>
                    <select 
                      className="form-select" 
                      id="brand" 
                      name="brand" 
                      value={formData.brand} 
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select brand</option>
                      {brands.map(brand => (
                        <option key={brand} value={brand.toLowerCase()}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-6">
                    <label htmlFor="model" className="form-label">Model*</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="model" 
                      name="model" 
                      value={formData.model} 
                      onChange={handleInputChange}
                      placeholder="e.g. 208, Golf, Clio"
                      required
                    />
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="year" className="form-label">Year*</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="year" 
                      name="year" 
                      value={formData.year} 
                      onChange={handleInputChange}
                      min="1980"
                      max="2025"
                      placeholder="e.g. 2018"
                      required
                    />
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="condition" className="form-label">Condition</label>
                    <select 
                      className="form-select" 
                      id="condition" 
                      name="condition" 
                      value={formData.condition} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select condition</option>
                      <option value="excellent">Excellent</option>
                      <option value="très bon">Très bon</option>
                      <option value="bon">Bon</option>
                      <option value="correct">Correct</option>
                      <option value="endommagé">Endommagé</option>
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="mileage" className="form-label">Mileage (km)*</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="mileage" 
                      name="mileage" 
                      value={formData.mileage} 
                      onChange={handleInputChange}
                      min="0"
                      placeholder="e.g. 75000"
                      required
                    />
                  </div>
                  
                  {/* Technical Details */}
                  <div className="col-md-4">
                    <label htmlFor="fuel_type" className="form-label">Fuel Type*</label>
                    <select 
                      className="form-select" 
                      id="fuel_type" 
                      name="fuel_type" 
                      value={formData.fuel_type} 
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select fuel type</option>
                      <option value="essence">Essence</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="electric">Electric</option>
                      <option value="gpl">GPL</option>
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="transmission" className="form-label">Transmission*</label>
                    <select 
                      className="form-select" 
                      id="transmission" 
                      name="transmission" 
                      value={formData.transmission} 
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select transmission</option>
                      <option value="manuelle">Manuelle</option>
                      <option value="automatique">Automatique</option>
                      <option value="semi-automatique">Semi-automatique</option>
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="fiscal_power" className="form-label">Fiscal Power*</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="fiscal_power" 
                      name="fiscal_power" 
                      value={formData.fiscal_power} 
                      onChange={handleInputChange}
                      min="1"
                      max="40"
                      placeholder="e.g. 8"
                      required
                    />
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="door_count" className="form-label">Door Count</label>
                    <select 
                      className="form-select" 
                      id="door_count" 
                      name="door_count" 
                      value={formData.door_count} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select door count</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="origin" className="form-label">Origin</label>
                    <select 
                      className="form-select" 
                      id="origin" 
                      name="origin" 
                      value={formData.origin} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select origin</option>
                      <option value="WW au Maroc">WW au Maroc</option>
                      <option value="Importé neuf">Importé neuf</option>
                      <option value="Importé occasion">Importé occasion</option>
                      <option value="Dédouané">Dédouané</option>
                    </select>
                  </div>
                  
                  <div className="col-md-4">
                    <label htmlFor="seller_city" className="form-label">Seller City</label>
                    <select 
                      className="form-select" 
                      id="seller_city" 
                      name="seller_city" 
                      value={formData.seller_city} 
                      onChange={handleInputChange}
                    >
                      <option value="">Select city</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-12">
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="first_owner" 
                        name="first_owner" 
                        checked={formData.first_owner} 
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label" htmlFor="first_owner">
                        First Owner
                      </label>
                    </div>
                  </div>
                  
                  {/* Equipment Section */}
                  <div className="col-12 mt-4">
                    <h5 className="fw-bold mb-3">Equipment</h5>
                    <div className="row">
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="jantes_aluminium" 
                            name="jantes_aluminium" 
                            checked={equipment.jantes_aluminium} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="jantes_aluminium">
                            Jantes aluminium
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="alarme" 
                            name="alarme" 
                            checked={equipment.alarme} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="alarme">
                            Alarme
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="airbags" 
                            name="airbags" 
                            checked={equipment.airbags} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="airbags">
                            Airbags
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="abs" 
                            name="abs" 
                            checked={equipment.abs} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="abs">
                            ABS
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="vitres_electriques" 
                            name="vitres_electriques" 
                            checked={equipment.vitres_electriques} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="vitres_electriques">
                            Vitres électriques
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="toit_ouvrant" 
                            name="toit_ouvrant" 
                            checked={equipment.toit_ouvrant} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="toit_ouvrant">
                            Toit ouvrant
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="camera_recul" 
                            name="camera_recul" 
                            checked={equipment.camera_recul} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="camera_recul">
                            Caméra de recul
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="climatisation" 
                            name="climatisation" 
                            checked={equipment.climatisation} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="climatisation">
                            Climatisation
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="esp" 
                            name="esp" 
                            checked={equipment.esp} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="esp">
                            ESP
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="ordinateur_bord" 
                            name="ordinateur_bord" 
                            checked={equipment.ordinateur_bord} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="ordinateur_bord">
                            Ordinateur de bord
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="radar_recul" 
                            name="radar_recul" 
                            checked={equipment.radar_recul} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="radar_recul">
                            Radar de recul
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="gps" 
                            name="gps" 
                            checked={equipment.gps} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="gps">
                            Système de navigation/GPS
                          </label>
                        </div>
                      </div>
                      
                      <div className="col-md-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="verrouillage_centralise" 
                            name="verrouillage_centralise" 
                            checked={equipment.verrouillage_centralise} 
                            onChange={handleEquipmentChange}
                          />
                          <label className="form-check-label" htmlFor="verrouillage_centralise">
                            Verrouillage centralisé
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12 mt-4">
                    <button 
                      type="submit" 
                      className="btn btn-warning btn-lg px-4 rounded-pill"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Calculating...
                        </>
                      ) : 'Predict Price'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div className="col-lg-4">
          <div className="sticky-top" style={{ top: '20px' }}>
            {/* Prediction Result */}
            <div className={`card shadow-sm rounded-4 mb-4 ${predictedPrice ? 'border-warning' : ''}`}>
              <div className="card-body p-4 text-center">
                <h4 className="fw-bold mb-3">Estimated Price</h4>
                
                {predictedPrice ? (
                  <div className="mb-3">
                    <h2 className="display-4 fw-bold text-warning">
                      {predictedPrice.toLocaleString()} MAD
                    </h2>
                    <p className="text-muted mb-0">Based on {selectedModel.toUpperCase()} model</p>
                  </div>
                ) : (
                  <div className="py-5 text-muted">
                    <FaCarSide size={50} className="mb-3 text-secondary opacity-50" />
                    <p>Fill the form and click "Predict Price" to get an estimation</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Info Cards */}
            <div className="card shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-warning p-2 rounded-circle me-3">
                    <FaCog className="text-white" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">How It Works</h5>
                    <p className="text-muted mb-0">Our advanced ML models</p>
                  </div>
                </div>
                <p className="mb-0">
                  Our models are trained on more than 60,000 vehicle listings from Avito and Moteur.ma. 
                  Data is processed using Apache Spark and stored in Cassandra, with regular retraining 
                  via Airflow to ensure accuracy.
                </p>
              </div>
            </div>
            
            <div className="card shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-warning p-2 rounded-circle me-3">
                    <MdCompareArrows className="text-white" />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Compare Models</h5>
                    <p className="text-muted mb-0">Try different algorithms</p>
                  </div>
                </div>
                <p className="mb-0">
                  Different ML models have different strengths. Try multiple models to get a range 
                  of predictions and better understand your vehicle's market value.
                </p>
              </div>
            </div>
            
            <div className="card shadow-sm rounded-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-warning p-2 rounded-circle me-3">
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0">Get Recommendations</h5>
                    <p className="text-muted mb-0">Find similar vehicles</p>
                  </div>
                </div>
                <div className="d-grid">
                  <button className="btn btn-outline-warning">
                    View Similar Vehicles <FaArrowRight className="ms-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionPage;