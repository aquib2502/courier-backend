import Rate from '../models/rateModel.js';
import DomesticRate from '../models/domesticRateModel.js';
import { calculateDomesticRate as runCalculator } from '../utils/domesticRateCalculator.js';
import countries from 'world-countries';
import fs from 'fs';
import path from 'path';

// Seed full initial data
export const seedRates = async (req, res) => {
  try {
    // delete existing rates
    await Rate.deleteMany({});
    console.log('Existing rates deleted');

    // Load international rates from JSON
    const seedData = JSON.parse(fs.readFileSync(path.resolve('./internationalRates.json'), 'utf8'));

    await Rate.insertMany(seedData);
    console.log('Seeding completed', seedData.length, 'records added.');

    res.status(201).json({ message: 'All rates seeded successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Seeding failed', error: error.message });
  }
};

// Create a new rate
export const createRate = async (req, res) => {
  try {
    const { weight, dest_country, package: pkg, rate } = req.body;

    const newRate = await Rate.create({ weight, dest_country, package: pkg, rate });
    res.status(201).json(newRate);
  } catch (error) {
    res.status(400).json({ message: 'Error creating rate', error: error.message });
  }
};

// Get all rates
export const getAllRates = async (req, res) => {
  try {
    const { dest_country, package: pkg } = req.query;
    const filter = {};
    if (dest_country) {
      filter.dest_country = dest_country;
    }
    if (pkg) {
      filter.package = pkg;
    }
    const rates = await Rate.find(filter).sort({ dest_country: 1, weight: 1 });
    res.status(200).json(rates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rates', error: error.message });
  }
};

// Update a rate
export const updateRate = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedRate = await Rate.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!updatedRate) {
      return res.status(404).json({ message: 'Rate not found' });
    }

    res.status(200).json(updatedRate);
  } catch (error) {
    res.status(400).json({ message: 'Error updating rate', error: error.message });
  }
};

// Delete a rate
export const deleteRate = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRate = await Rate.findByIdAndDelete(id);

    if (!deletedRate) {
      return res.status(404).json({ message: 'Rate not found' });
    }

    res.status(200).json({ message: 'Rate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting rate', error: error.message });
  }
};

// controllers/countryController.js

export const getAllCountries = async (req, res) => {
  try {
    // Format countries for dropdown: { name: "India", code: "IND" }
    const formattedCountries = countries.map((country) => ({
      name: country.name.common,
      code: country.cca3, // Alpha-3 code like IND, USA, GBR
    }));

    // Sort alphabetically by name
    formattedCountries.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json(formattedCountries);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching countries",
      error: error.message,
    });
  }
};

// Calculate domestic rate
export const calculateDomesticRate = async (req, res) => {
  try {
    const { courier, weight, pickup, delivery } = req.body;

    if (!courier || !weight) {
      return res.status(400).json({ message: 'Courier and weight are required' });
    }

    const domesticRates = await DomesticRate.find({});
    const rateVal = runCalculator(courier, weight, pickup, delivery)(domesticRates);

    res.status(200).json({ success: true, rate: rateVal });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error calculating domestic rate' });
  }
};


