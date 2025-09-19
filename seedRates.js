import mongoose from "mongoose";
import Rate from "./models/rateModel.js"; // your model
import countries from "world-countries"; // npm install world-countries
import dotenv from 'dotenv'
dotenv.config();

// Your raw seed data with just names, no codes in parentheses
const seedData = [
  // USA rates
  { weight: 0.050, dest_country: "United States", package: "Cheaper", rate: 404 },
  { weight: 0.100, dest_country: "United States", package: "Cheaper", rate: 450 },
  { weight: 0.150, dest_country: "United States", package: "Cheaper", rate: 500 },
  { weight: 0.200, dest_country: "United States", package: "Cheaper", rate: 550 },
  { weight: 0.250, dest_country: "United States", package: "Cheaper", rate: 600 },
  { weight: 0.300, dest_country: "United States", package: "Cheaper", rate: 650 },
  { weight: 0.350, dest_country: "United States", package: "Cheaper", rate: 700 },
  { weight: 0.400, dest_country: "United States", package: "Cheaper", rate: 750 },
  { weight: 0.426, dest_country: "United States", package: "Cheaper", rate: 800 },
  { weight: 0.756, dest_country: "United States", package: "Cheaper", rate: 900 },
  { weight: 1.001, dest_country: "United States", package: "Cheaper", rate: 1200 },
  { weight: 1.251, dest_country: "United States", package: "Cheaper", rate: 1400 },
  { weight: 1.501, dest_country: "United States", package: "Cheaper", rate: 1600 },
  { weight: 1.751, dest_country: "United States", package: "Cheaper", rate: 1800 },

  // Remote USA (still USA but maybe a special package)
  { weight: 0.050, dest_country: "United States", package: "Cheaper Remote", rate: 500 },
  { weight: 0.100, dest_country: "United States", package: "Cheaper Remote", rate: 580 },
  { weight: 0.150, dest_country: "United States", package: "Cheaper Remote", rate: 650 },

  // UK rates
  { weight: 0.050, dest_country: "United Kingdom", package: "Premium", rate: 800 },
  { weight: 0.100, dest_country: "United Kingdom", package: "Premium", rate: 900 },
  { weight: 0.150, dest_country: "United Kingdom", package: "Premium", rate: 1000 },
  { weight: 0.200, dest_country: "United Kingdom", package: "Premium", rate: 1100 },
  { weight: 0.250, dest_country: "United Kingdom", package: "Premium", rate: 1200 },
  { weight: 0.300, dest_country: "United Kingdom", package: "Premium", rate: 1300 },
  { weight: 0.350, dest_country: "United Kingdom", package: "Premium", rate: 1400 },
  { weight: 0.400, dest_country: "United Kingdom", package: "Premium", rate: 1500 },
  { weight: 0.450, dest_country: "United Kingdom", package: "Premium", rate: 1600 },
  { weight: 0.500, dest_country: "United Kingdom", package: "Premium", rate: 1700 },
  { weight: 0.600, dest_country: "United Kingdom", package: "Premium", rate: 1900 },
  { weight: 0.700, dest_country: "United Kingdom", package: "Premium", rate: 2100 },
  { weight: 0.800, dest_country: "United Kingdom", package: "Premium", rate: 2300 },
  { weight: 0.900, dest_country: "United Kingdom", package: "Premium", rate: 2500 },
  { weight: 1.000, dest_country: "United Kingdom", package: "Premium", rate: 2700 },

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

// Utility to get ISO Alpha-3 code
const getCountryCode = (countryName) => {
  const customMapping = {
    "Rest of World": "ROW", // fallback code for generic group
  };

  if (customMapping[countryName]) return customMapping[countryName];

  const found = countries.find(
    (c) =>
      c.name.common.toLowerCase() === countryName.toLowerCase() ||
      c.name.official.toLowerCase() === countryName.toLowerCase()
  );

  return found ? found.cca3 : null; // e.g., USA, GBR, AUS
};

const seedRates = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "courierAhad"
    });
    console.log("Connected to MongoDB");

    // Clear existing data
    await Rate.deleteMany({});
    console.log("Old rates cleared");

    // Add codes dynamically
    const ratesWithCodes = seedData.map((item) => ({
      ...item,
      dest_country_code: getCountryCode(item.dest_country),
    }));

    console.log("Sample seeded data:", ratesWithCodes.slice(0, 5));

    // Insert into DB
    await Rate.insertMany(ratesWithCodes);
    console.log("Rates seeded successfully!");

    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding rates:", error);
    mongoose.connection.close();
  }
};

seedRates();
