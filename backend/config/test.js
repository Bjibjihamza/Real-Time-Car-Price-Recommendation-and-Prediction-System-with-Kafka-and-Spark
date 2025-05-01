const cassandra = require('cassandra-driver');
const fs = require('fs');
require('dotenv').config();

// Create a client with contactPoints and localDataCenter
const client = new cassandra.Client({
  contactPoints: [process.env.CASSANDRA_CONTACT_POINT || 'localhost'],
  localDataCenter: process.env.CASSANDRA_LOCAL_DATACENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'cars_keyspace'
});

// Function to extract unique values and save to CSV
async function extractUniqueValues() {
  try {
    // Connect to the cluster
    await client.connect();
    console.log('Connected to Cassandra');

    // Query to select all records from cleaned_cars
    const query = 'SELECT brand, fuel_type, transmission, sector FROM cleaned_cars';
    const result = await client.execute(query);

    // Extract unique values using Sets
    const brands = new Set();
    const fuelTypes = new Set();
    const transmissions = new Set();
    const sectors = new Set();

    result.rows.forEach(row => {
      brands.add(row.brand || ''); // Handle null values
      fuelTypes.add(row.fuel_type || '');
      transmissions.add(row.transmission || '');
      sectors.add(row.sector || '');
    });

    // Convert Sets to Arrays
    const uniqueBrands = Array.from(brands);
    const uniqueFuelTypes = Array.from(fuelTypes);
    const uniqueTransmissions = Array.from(transmissions);
    const uniqueSectors = Array.from(sectors);

    // Prepare data for CSV (align lengths by padding with empty strings)
    const maxLength = Math.max(uniqueBrands.length, uniqueFuelTypes.length, uniqueTransmissions.length, uniqueSectors.length);
    const csvData = [
      ['Brand', 'Fuel Type', 'Transmission', 'Sector'], // Header
      ...Array.from({ length: maxLength }, (_, i) => [
        uniqueBrands[i] || '',
        uniqueFuelTypes[i] || '',
        uniqueTransmissions[i] || '',
        uniqueSectors[i] || ''
      ])
    ];

    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');

    // Write to CSV file
    fs.writeFileSync('unique_car_attributes.csv', csvContent);
    console.log('Unique values have been exported to unique_car_attributes.csv');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the connection
    await client.shutdown();
    console.log('Cassandra connection closed');
  }
}

// Run the function
extractUniqueValues();
