import mongoose from "mongoose";
import dotenv from "dotenv";
import Rate from "./models/rateModel.js"; // Your Rate model file

dotenv.config();

// Your seed data
const seedData = [
  // USA (mainland)
  { weight: 0.050, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 677.9661017 },
  { weight: 0.100, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 762.7118644 },
  { weight: 0.150, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 805.0847458 },
  { weight: 0.200, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 847.4576271 },
  { weight: 0.250, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 932.2033898 },
  { weight: 0.300, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1016.949153 },
  { weight: 0.350, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1101.694915 },
  { weight: 0.400, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1186.440678 },
  { weight: 0.450, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1271.186441 },
  { weight: 0.500, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1355.932203 },
  { weight: 0.600, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1440.677966 },
  { weight: 0.700, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1525.423729 },
  { weight: 0.800, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1610.169492 },
  { weight: 0.900, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1694.915254 },
  { weight: 1.000, dest_country: "United States (USA)", dest_country_code: "USA", package: "Premium Self", rate: 1779.661017 },

  // Remote USA
  { weight: 0.050, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1000 },
  { weight: 0.100, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1127 },
  { weight: 0.150, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1186 },
  { weight: 0.200, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1203 },
  { weight: 0.250, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1237 },
  { weight: 0.300, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1271 },
  { weight: 0.350, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1297 },
  { weight: 0.400, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1322 },
  { weight: 0.450, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1407 },
  { weight: 0.500, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1500 },
  { weight: 0.600, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1551 },
  { weight: 0.700, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1593 },
  { weight: 0.800, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1644 },
  { weight: 0.900, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1686 },
  { weight: 1.000, dest_country: "United States (Remote)", dest_country_code: "USA", package: "Premium Self", rate: 1737 },

  // UK
  { weight: 0.050, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 636 },
  { weight: 0.100, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 712 },
  { weight: 0.150, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 780 },
  { weight: 0.200, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 847 },
  { weight: 0.250, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 907 },
  { weight: 0.300, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 966 },
  { weight: 0.350, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 1025 },
  { weight: 0.400, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 1085 },
  { weight: 0.450, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 1144 },
  { weight: 0.500, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 1212 },
  { weight: 0.600, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 1314 },
  { weight: 0.700, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 1415 },
  { weight: 0.800, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 1517 },
  { weight: 0.900, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 1619 },
  { weight: 1.000, dest_country: "United Kingdom (UK)", dest_country_code: "GBR", package: "DDP PREMIUM", rate: 1720 },

  // Australia
  { weight: 0.050, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 831 },
  { weight: 0.100, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 873 },
  { weight: 0.150, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1076 },
  { weight: 0.200, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1093 },
  { weight: 0.250, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1127 },
  { weight: 0.300, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1161 },
  { weight: 0.350, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1186 },
  { weight: 0.400, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1212 },
  { weight: 0.450, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1297 },
  { weight: 0.500, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1390 },
  { weight: 0.600, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1441 },
  { weight: 0.700, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1483 },
  { weight: 0.800, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1534 },
  { weight: 0.900, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1576 },
  { weight: 1.000, dest_country: "Australia", dest_country_code: "AUS", package: "DDP PREMIUM", rate: 1627 },

  // Canada
  { weight: 0.050, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 831 },
  { weight: 0.100, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 873 },
  { weight: 0.150, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1076 },
  { weight: 0.200, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1093 },
  { weight: 0.250, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1127 },
  { weight: 0.300, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1161 },
  { weight: 0.350, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1186 },
  { weight: 0.400, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1212 },
  { weight: 0.450, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1297 },
  { weight: 0.500, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1390 },
  { weight: 0.600, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1441 },
  { weight: 0.700, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1483 },
  { weight: 0.800, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1534 },
  { weight: 0.900, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1576 },
  { weight: 1.000, dest_country: "Canada", dest_country_code: "CAN", package: "DDP PREMIUM", rate: 1627 },

  // Rest of World
  { weight: 0.050, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 966 },
  { weight: 0.100, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1000 },
  { weight: 0.150, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1034 },
  { weight: 0.200, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1051 },
  { weight: 0.250, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1085 },
  { weight: 0.300, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1119 },
  { weight: 0.350, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1144 },
  { weight: 0.400, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1169 },
  { weight: 0.450, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1254 },
  { weight: 0.500, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1347 },
  { weight: 0.600, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1398 },
  { weight: 0.700, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1441 },
  { weight: 0.800, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1492 },
  { weight: 0.900, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1534 },
  { weight: 1.000, dest_country: "Rest of World", dest_country_code: "ROW", package: "DDP PREMIUM", rate: 1585 },
];

// Seed function
const seedRates = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: "courierAhad",
    });

    console.log("Connected to MongoDB");

    // Clear collection
    await Rate.deleteMany({});
    console.log("Old rates cleared");

    // Insert new data
    await Rate.insertMany(seedData);
    console.log("Rates seeded successfully!");

    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding rates:", error);
    mongoose.connection.close();
  }
};

seedRates();
