import Rate from '../models/rateModel.js';


// Seed full initial data
export const seedRates = async (req, res) => {
  try {
    const existingRates = await Rate.find();
    if (existingRates.length > 0) {
      return res.status(400).json({ message: 'Rates already seeded!' });
    }

    const seedData = [
      // USA rates
      { weight: 0.050, dest_country: "United States (USA)", package: "Cheaper", rate: 404 },
      { weight: 0.100, dest_country: "United States (USA)", package: "Cheaper", rate: 450 },
      { weight: 0.150, dest_country: "United States (USA)", package: "Cheaper", rate: 500 },
      { weight: 0.200, dest_country: "United States (USA)", package: "Cheaper", rate: 550 },
      { weight: 0.250, dest_country: "United States (USA)", package: "Cheaper", rate: 600 },
      { weight: 0.300, dest_country: "United States (USA)", package: "Cheaper", rate: 650 },
      { weight: 0.350, dest_country: "United States (USA)", package: "Cheaper", rate: 700 },
      { weight: 0.400, dest_country: "United States (USA)", package: "Cheaper", rate: 750 },
      { weight: 0.426, dest_country: "United States (USA)", package: "Cheaper", rate: 800 },
      { weight: 0.756, dest_country: "United States (USA)", package: "Cheaper", rate: 900 },
      { weight: 1.001, dest_country: "United States (USA)", package: "Cheaper", rate: 1200 },
      { weight: 1.251, dest_country: "United States (USA)", package: "Cheaper", rate: 1400 },
      { weight: 1.501, dest_country: "United States (USA)", package: "Cheaper", rate: 1600 },
      { weight: 1.751, dest_country: "United States (USA)", package: "Cheaper", rate: 1800 },

      // Remote USA
      { weight: 0.050, dest_country: "United States (Remote)", package: "Cheaper", rate: 500 },
      { weight: 0.100, dest_country: "United States (Remote)", package: "Cheaper", rate: 580 },
      { weight: 0.150, dest_country: "United States (Remote)", package: "Cheaper", rate: 650 },

      // UK rates
      { weight: 0.050, dest_country: "United Kingdom (UK)", package: "Premium", rate: 800 },
      { weight: 0.100, dest_country: "United Kingdom (UK)", package: "Premium", rate: 900 },
      { weight: 0.150, dest_country: "United Kingdom (UK)", package: "Premium", rate: 1000 },
      { weight: 0.200, dest_country: "United Kingdom (UK)", package: "Premium", rate: 1100 },
      { weight: 0.250, dest_country: "United Kingdom (UK)", package: "Premium", rate: 1200 },
      { weight: 0.300, dest_country: "United Kingdom (UK)", package: "Premium", rate: 1300 },
      { weight: 0.350, dest_country: "United Kingdom (UK)", package: "Premium", rate: 1400 },
      { weight: 0.400, dest_country: "United Kingdom (UK)", package: "Premium", rate: 1500 },
      { weight: 0.450, dest_country: "United Kingdom (UK)", package: "Premium", rate: 1600 },
      { weight: 0.500, dest_country: "United Kingdom (UK)", package: "Premium", rate: 1700 },
      { weight: 0.600, dest_country: "United Kingdom (UK)", package: "Premium", rate: 1900 },
      { weight: 0.700, dest_country: "United Kingdom (UK)", package: "Premium", rate: 2100 },
      { weight: 0.800, dest_country: "United Kingdom (UK)", package: "Premium", rate: 2300 },
      { weight: 0.900, dest_country: "United Kingdom (UK)", package: "Premium", rate: 2500 },
      { weight: 1.000, dest_country: "United Kingdom (UK)", package: "Premium", rate: 2700 },

      // Australia rates
      { weight: 0.500, dest_country: "Australia", package: "UPS", rate: 2200 },
      { weight: 0.500, dest_country: "Australia", package: "DHL", rate: 2400 },
      { weight: 1.000, dest_country: "Australia", package: "UPS", rate: 3200 },
      { weight: 1.000, dest_country: "Australia", package: "DHL", rate: 3400 },

      // Rest of World
      { weight: 0.500, dest_country: "Rest of World", package: "UPS", rate: 2000 },
      { weight: 0.500, dest_country: "Rest of World", package: "DHL", rate: 2100 },
      { weight: 1.000, dest_country: "Rest of World", package: "UPS", rate: 3000 },
      { weight: 1.000, dest_country: "Rest of World", package: "DHL", rate: 3100 },
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
