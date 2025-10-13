import Rate from '../models/rateModel.js';
import countries from 'world-countries';



// Seed full initial data
export const seedRates = async (req, res) => {
  try {
    await Rate.deleteMany();
    console.log('Existing rates cleared');

const seedData = [
  // USA (mainland)
  { weight: 0.050, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 677.9661017 },
  { weight: 0.100, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 762.7118644 },
  { weight: 0.150, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 805.0847458 },
  { weight: 0.200, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 847.4576271 },
  { weight: 0.250, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 932.2033898 },
  { weight: 0.300, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1016.949153 },
  { weight: 0.350, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1101.694915 },
  { weight: 0.400, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1186.440678 },
  { weight: 0.450, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1271.186441 },
  { weight: 0.500, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1355.932203 },
  { weight: 0.600, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1440.677966 },
  { weight: 0.700, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1525.423729 },
  { weight: 0.800, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1610.169492 },
  { weight: 0.900, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1694.915254 },
  { weight: 1.000, dest_country: "United States", country_code: "USA", package: "Premium Self", rate: 1779.661017 },

  // Remote USA (Hawaii, Alaska, Puerto Rico) - UPDATED RATES
  { weight: 0.050, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1000 },
  { weight: 0.100, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1127 },
  { weight: 0.150, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1186 },
  { weight: 0.200, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1203 },
  { weight: 0.250, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1237 },
  { weight: 0.300, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1271 },
  { weight: 0.350, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1297 },
  { weight: 0.400, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1322 },
  { weight: 0.450, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1407 },
  { weight: 0.500, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1500 },
  { weight: 0.600, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1551 },
  { weight: 0.700, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1593 },
  { weight: 0.800, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1644 },
  { weight: 0.900, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1686 },
  { weight: 1.000, dest_country: "United States (Remote)", country_code: "USA", package: "Premium Self", rate: 1737 },

  // United Kingdom - Premium DPD
  { weight: 0.050, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 636 },
  { weight: 0.100, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 712 },
  { weight: 0.150, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 780 },
  { weight: 0.200, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 847 },
  { weight: 0.250, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 907 },
  { weight: 0.300, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 966 },
  { weight: 0.350, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 1025 },
  { weight: 0.400, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 1085 },
  { weight: 0.450, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 1144 },
  { weight: 0.500, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 1212 },
  { weight: 0.600, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 1314 },
  { weight: 0.700, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 1415 },
  { weight: 0.800, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 1517 },
  { weight: 0.900, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 1619 },
  { weight: 1.000, dest_country: "United Kingdom", country_code: "GBR", package: "Premium DPD", rate: 1720 },

  // Australia - Premium DPD
  { weight: 0.050, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 831 },
  { weight: 0.100, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 873 },
  { weight: 0.150, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1076 },
  { weight: 0.200, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1093 },
  { weight: 0.250, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1127 },
  { weight: 0.300, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1161 },
  { weight: 0.350, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1186 },
  { weight: 0.400, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1212 },
  { weight: 0.450, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1297 },
  { weight: 0.500, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1390 },
  { weight: 0.600, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1441 },
  { weight: 0.700, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1483 },
  { weight: 0.800, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1534 },
  { weight: 0.900, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1576 },
  { weight: 1.000, dest_country: "Australia", country_code: "AUS", package: "Premium DPD", rate: 1627 },

  // Canada - Premium DPD
  { weight: 0.050, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 831 },
  { weight: 0.100, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 873 },
  { weight: 0.150, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1076 },
  { weight: 0.200, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1093 },
  { weight: 0.250, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1127 },
  { weight: 0.300, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1161 },
  { weight: 0.350, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1186 },
  { weight: 0.400, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1212 },
  { weight: 0.450, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1297 },
  { weight: 0.500, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1390 },
  { weight: 0.600, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1441 },
  { weight: 0.700, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1483 },
  { weight: 0.800, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1534 },
  { weight: 0.900, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1576 },
  { weight: 1.000, dest_country: "Canada", country_code: "CAN", package: "Premium DPD", rate: 1627 },

  // Rest of World - Premium DPD
  { weight: 0.050, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 966 },
  { weight: 0.100, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1000 },
  { weight: 0.150, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1034 },
  { weight: 0.200, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1051 },
  { weight: 0.250, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1085 },
  { weight: 0.300, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1119 },
  { weight: 0.350, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1144 },
  { weight: 0.400, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1169 },
  { weight: 0.450, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1254 },
  { weight: 0.500, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1347 },
  { weight: 0.600, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1398 },
  { weight: 0.700, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1441 },
  { weight: 0.800, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1492 },
  { weight: 0.900, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1534 },
  { weight: 1.000, dest_country: "Rest of World", country_code: "ROW", package: "Premium DPD", rate: 1585 },
];




    await Rate.insertMany(seedData);

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
    const rates = await Rate.find().sort({ dest_country: 1, weight: 1 });
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

