const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");

const app = express();
const port = 3000;

// Middleware to parse JSON data
app.use(bodyParser.json());



require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on("error", (err) => {
  console.error("Database error:", err);
});

// Start serve
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Add School Endpoint
app.post("/addSchool", (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  // Input validation
  if (!name || !address || !latitude || !longitude) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res
      .status(400)
      .json({ error: "Latitude and Longitude must be numbers" });
  }

  // SQL query to insert data
  const sql =
    "INSERT INTO school (name, address, latitude, longitude) VALUES (?, ?, ?, ?)";
  pool.query(sql, [name, address, latitude, longitude], (err, result) => {
    if (err) {
      console.error("Error inserting data:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({
      message: "School added successfully",
      schoolId: result.insertId,
    });
  });
});

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

app.get("/listSchools", (req, res) => {
  const userLatitude = parseFloat(req.query.latitude);
  const userLongitude = parseFloat(req.query.longitude);

  // Validate query parameters
  if (!userLatitude || !userLongitude) {
    return res
      .status(400)
      .json({ error: "Latitude and Longitude are required" });
  }

  // Fetch school from the database
  const sql = "SELECT id, name, address, latitude, longitude FROM school";
  pool.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Calculate distances and sort
    const schoolsWithDistance = results.map((school) => ({
      ...school,
      distance: haversineDistance(
        userLatitude,
        userLongitude,
        school.latitude,
        school.longitude
      ),
    }));

    // Sort by distance
    schoolsWithDistance.sort((a, b) => a.distance - b.distance);

    // Return the sorted list
    res.json(schoolsWithDistance);
  });
});
