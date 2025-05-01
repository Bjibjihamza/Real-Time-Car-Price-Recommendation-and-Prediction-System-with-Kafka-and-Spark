const client = require('../config/db');
const { types } = require('cassandra-driver');
const { v4: uuidv4 } = require('uuid');
const { validate: isUUID } = require('uuid'); // Must be included

class Car {
  static async search(filters, retryCount = 3) {
    try {
      let query = 'SELECT * FROM cars_keyspace.cleaned_cars';
      const params = [];
      const conditions = [];
  
      if (filters.brand) {
        if (Array.isArray(filters.brand)) {
          conditions.push(`brand IN (${filters.brand.map(() => '?').join(',')})`);
          params.push(...filters.brand);
        } else {
          conditions.push('brand = ?');
          params.push(filters.brand);
        }
      }
      if (filters.model) {
        conditions.push('model = ?');
        params.push(filters.model);
      }
      if (filters.minPrice) {
        conditions.push('price >= ?');
        params.push(parseInt(filters.minPrice));
      }
      if (filters.maxPrice) {
        conditions.push('price <= ?');
        params.push(parseInt(filters.maxPrice));
      }
      if (filters.minYear) {
        conditions.push('year >= ?');
        params.push(parseInt(filters.minYear));
      }
      if (filters.maxYear) {
        conditions.push('year <= ?');
        params.push(parseInt(filters.maxYear));
      }
      if (filters.fuelType) {
        if (Array.isArray(filters.fuelType)) {
          conditions.push(`fuel_type IN (${filters.fuelType.map(() => '?').join(',')})`);
          params.push(...filters.fuelType);
        } else {
          conditions.push('fuel_type = ?');
          params.push(filters.fuelType);
        }
      }
      if (filters.transmission) {
        if (Array.isArray(filters.transmission)) {
          conditions.push(`transmission IN (${filters.transmission.map(() => '?').join(',')})`);
          params.push(...filters.transmission);
        } else {
          conditions.push('transmission = ?');
          params.push(filters.transmission);
        }
      }
      if (filters.doorCount) {
        if (Array.isArray(filters.doorCount)) {
          conditions.push(`door_count IN (${filters.doorCount.map(() => '?').join(',')})`);
          params.push(...filters.doorCount);
        } else {
          conditions.push('door_count = ?');
          params.push(parseInt(filters.doorCount));
        }
      }
      if (filters.mileageMin) {
        conditions.push('mileage >= ?');
        params.push(parseInt(filters.mileageMin));
      }
      if (filters.mileageMax) {
        conditions.push('mileage <= ?');
        params.push(parseInt(filters.mileageMax));
      }
      if (filters.sellerCity) {
        conditions.push('seller_city = ?');
        params.push(filters.sellerCity);
      }
      if (filters.sector) {
        conditions.push('sector = ?');
        params.push(filters.sector);
      }
  
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ') + ' ALLOW FILTERING';
      } else {
        query += ' LIMIT 1000';
      }
  
      const result = await client.execute(query, params, { prepare: true });
      return result.rows.map(car => ({
        id: car.id.toString(),
        brand: car.brand,
        model: car.model,
        title: car.title,
        price: car.price,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        year: car.year,
        door_count: car.door_count,
        seller_city: car.seller_city,
        sector: car.sector,
        publication_date: car.publication_date,
        condition: car.condition,
        creator: car.creator,
        equipment: car.equipment,
        first_owner: car.first_owner,
        fiscal_power: car.fiscal_power,
        image_folder: car.image_folder,
        mileage: car.mileage,
        origin: car.origin,
        source: car.source
      }));
    } catch (error) {
      if (retryCount > 0) {
        console.warn(`Retrying search query, attempts left: ${retryCount}`);
        return this.search(filters, retryCount - 1);
      }
      throw error;
    }
  }

  static async getById(id) {
    if (!isUUID(id)) {
      console.error('Invalid car id format in Car.getById:', id);
      return null;
    }

    try {
      const query = `
        SELECT *
        FROM cars_keyspace.cleaned_cars
        WHERE id = ?
      `;
      const result = await client.execute(query, [id], { prepare: true });
      if (result.rows.length === 0) {
        console.log('No car found for id:', id);
        return null;
      }

      const car = result.rows[0];
      return {
        id: car.id.toString(),
        brand: car.brand,
        model: car.model,
        title: car.title,
        price: car.price,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        year: car.year,
        door_count: car.door_count,
        seller_city: car.seller_city,
        sector: car.sector,
        publication_date: car.publication_date,
        condition: car.condition,
        creator: car.creator,
        equipment: car.equipment,
        first_owner: car.first_owner,
        fiscal_power: car.fiscal_power,
        image_folder: car.image_folder,
        mileage: car.mileage,
        origin: car.origin,
        source: car.source
      };
    } catch (error) {
      console.error('Error in Car.getById:', error);
      return null;
    }
  }

  static async search(filters, retryCount = 3) {
    try {
      let query = 'SELECT * FROM cars_keyspace.cleaned_cars';
      const params = [];
      const conditions = [];

      if (filters.brand) {
        if (Array.isArray(filters.brand)) {
          conditions.push(`brand IN (${filters.brand.map(() => '?').join(',')})`);
          params.push(...filters.brand);
        } else {
          conditions.push('brand = ?');
          params.push(filters.brand);
        }
      }
      if (filters.fuelType) {
        if (Array.isArray(filters.fuelType)) {
          conditions.push(`fuel_type IN (${filters.fuelType.map(() => '?').join(',')})`);
          params.push(...filters.fuelType);
        } else {
          conditions.push('fuel_type = ?');
          params.push(filters.fuelType);
        }
      }
      if (filters.transmission) {
        if (Array.isArray(filters.transmission)) {
          conditions.push(`transmission IN (${filters.transmission.map(() => '?').join(',')})`);
          params.push(...filters.transmission);
        } else {
          conditions.push('transmission = ?');
          params.push(filters.transmission);
        }
      }
      if (filters.minPrice) {
        conditions.push('price >= ?');
        params.push(parseInt(filters.minPrice));
      }
      if (filters.maxPrice) {
        conditions.push('price <= ?');
        params.push(parseInt(filters.maxPrice));
      }
      if (filters.minYear) {
        conditions.push('year >= ?');
        params.push(parseInt(filters.minYear));
      }
      if (filters.maxYear) {
        conditions.push('year <= ?');
        params.push(parseInt(filters.maxYear));
      }
      if (filters.doorCount) {
        if (Array.isArray(filters.doorCount)) {
          conditions.push(`door_count IN (${filters.doorCount.map(() => '?').join(',')})`);
          params.push(...filters.doorCount);
        } else {
          conditions.push('door_count = ?');
          params.push(parseInt(filters.doorCount));
        }
      }
      if (filters.mileageMin) {
        conditions.push('mileage >= ?');
        params.push(parseInt(filters.mileageMin));
      }
      if (filters.mileageMax) {
        conditions.push('mileage <= ?');
        params.push(parseInt(filters.mileageMax));
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ') + ' ALLOW FILTERING';
      } else {
        query += ' LIMIT 1000';
      }

      console.log('Executing search query:', query, 'with params:', params);
      const result = await client.execute(query, params, { prepare: true });
      console.log('Search returned', result.rows.length, 'cars');
      return result.rows.map(car => ({
        id: car.id.toString(),
        brand: car.brand,
        model: car.model,
        title: car.title,
        price: car.price,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        year: car.year,
        door_count: car.door_count,
        seller_city: car.seller_city,
        sector: car.sector,
        publication_date: car.publication_date,
        condition: car.condition,
        creator: car.creator,
        equipment: car.equipment,
        first_owner: car.first_owner,
        fiscal_power: car.fiscal_power,
        image_folder: car.image_folder,
        mileage: car.mileage,
        origin: car.origin,
        source: car.source
      }));
    } catch (error) {
      console.error('Error in Car.search:', error);
      if (retryCount > 0) {
        console.warn(`Retrying search query, attempts left: ${retryCount}`);
        return this.search(filters, retryCount - 1);
      }
      return [];
    }
  }


  static async getAll(page, limit) {
    const offset = (page - 1) * limit;
    const query = 'SELECT * FROM cars_keyspace.cleaned_cars LIMIT 1000';
    const result = await client.execute(query, [], { prepare: true });
    const total = result.rows.length;
    const cars = result.rows
      .slice(offset, offset + limit)
      .map(car => ({
        id: car.id.toString(),
        brand: car.brand,
        model: car.model,
        title: car.title,
        price: car.price,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        year: car.year,
        door_count: car.door_count,
        seller_city: car.seller_city,
        sector: car.sector,
        publication_date: car.publication_date,
        condition: car.condition,
        creator: car.creator,
        equipment: car.equipment,
        first_owner: car.first_owner,
        fiscal_power: car.fiscal_power,
        image_folder: car.image_folder,
        mileage: car.mileage,
        origin: car.origin,
        source: car.source,
      }));
    return { cars, total };
  }

  static async getLatest(limit) {
    console.log('Fetching latest cars with limit:', limit);
    const query = 'SELECT * FROM cars_keyspace.cleaned_cars LIMIT 1000';
    const result = await client.execute(query, [], { prepare: true });
    console.log('Fetched rows:', result.rows.length);

    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes);
    };

    return result.rows
      .filter(car => car.publication_date)
      .sort((a, b) => {
        const dateA = parseDate(a.publication_date);
        const dateB = parseDate(b.publication_date);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      })
      .slice(0, limit)
      .map(car => ({
        id: car.id.toString(),
        brand: car.brand,
        model: car.model,
        title: car.title,
        price: car.price,
        fuel_type: car.fuel_type,
        transmission: car.transmission,
        year: car.year,
        door_count: car.door_count,
        seller_city: car.seller_city,
        sector: car.sector,
        publication_date: car.publication_date,
        condition: car.condition,
        creator: car.creator,
        equipment: car.equipment,
        first_owner: car.first_owner,
        fiscal_power: car.fiscal_power,
        image_folder: car.image_folder,
        mileage: car.mileage,
        origin: car.origin,
        source: car.source,
      }));
  }

  static async getFavoritesByUserId(userId) {
    try {
      const userUuid = types.Uuid.fromString(userId);
      const query = 'SELECT car_id FROM cars_keyspace.favorite_cars_by_user WHERE user_id = ?';
      const result = await client.execute(query, [userUuid], { prepare: true });
      const carIds = result.rows.map(row => row.car_id.toString());
      if (carIds.length === 0) return [];

      const cars = [];
      for (const carId of carIds) {
        try {
          const car = await this.getById(carId);
          if (car) cars.push(car);
        } catch (error) {
          console.error(`Skipping invalid car ID ${carId}:`, error.message);
        }
      }
      return cars;
    } catch (error) {
      console.error('Error in getFavoritesByUserId:', error.message);
      return [];
    }
  }

  

  static async addFavorite(userId, carId) {
    try {
      const userUuid = types.Uuid.fromString(userId);
      const carUuid = types.Uuid.fromString(carId);
      const query = 'INSERT INTO cars_keyspace.favorite_cars_by_user (user_id, added_date, added_timestamp, car_id) VALUES (?, ?, ?, ?)';
      const addedDate = new Date().toISOString().split('T')[0];
      const timestamp = new Date();
      await client.execute(query, [userUuid, addedDate, timestamp, carUuid], { prepare: true });
    } catch (error) {
      console.error('Error in addFavorite:', error.message, 'carId:', carId);
      throw new Error('Invalid ID format');
    }
  }


  static async removeFavorite(userId, carId) {
    try {
      const userUuid = types.Uuid.fromString(userId);
      const carUuid = types.Uuid.fromString(carId);
  
      // Step 1: Find the favorite with matching user_id and car_id
      const findQuery = `
        SELECT added_date, added_timestamp, car_id 
        FROM cars_keyspace.favorite_cars_by_user 
        WHERE user_id = ? AND added_date = ?
      `;
      const addedDate = '2025-05-01'; // From logs, or dynamically fetch if needed
      const findResult = await client.execute(findQuery, [userUuid, addedDate], { prepare: true });
      console.log('Find result:', findResult.rows.map(row => ({
        added_date: row.added_date.toString(),
        added_timestamp: row.added_timestamp.toISOString(),
        car_id: row.car_id.toString()
      }))); // Debug log
  
      const favorite = findResult.rows.find(row => row.car_id.toString() === carId);
      if (!favorite) {
        console.log(`No favorite found for userId: ${userId}, carId: ${carId}`);
        return false; // Favorite doesn’t exist
      }
  
      console.log('Deleting with params:', {
        user_id: userUuid.toString(),
        added_date: favorite.added_date.toString(),
        added_timestamp: favorite.added_timestamp.toISOString(),
        car_id: carUuid.toString()
      }); // Debug log
  
      // Step 2: Delete using user_id, added_date, added_timestamp, and car_id
      const deleteQuery = `
        DELETE FROM cars_keyspace.favorite_cars_by_user 
        WHERE user_id = ? AND added_date = ? AND added_timestamp = ? AND car_id = ?
      `;
      await client.execute(deleteQuery, [userUuid, favorite.added_date, favorite.added_timestamp, carUuid], { prepare: true });
      console.log(`Removed favorite for userId: ${userId}, carId: ${carId}`);
      return true;
    } catch (error) {
      console.error('Error in removeFavorite:', error.message, 'userId:', userId, 'carId:', carId);
      throw error; // Propagate the actual error
    }
  }
}

module.exports = Car;