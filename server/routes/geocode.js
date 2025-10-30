import express from "express";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// Search geocoding (address to coordinates)
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q, limit = 1 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'QLTT-System/1.0 (contact@example.com)'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Geocoding search error:", error);
    res.status(500).json({ error: "Failed to geocode address" });
  }
});

// Reverse geocoding (coordinates to address)
router.get("/reverse", authenticate, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: "Query parameters 'lat' and 'lon' are required" });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      {
        headers: {
          'User-Agent': 'QLTT-System/1.0 (contact@example.com)'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    res.status(500).json({ error: "Failed to reverse geocode coordinates" });
  }
});

export default router;