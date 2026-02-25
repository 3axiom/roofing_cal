require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- API Routes ---

// Proxy: Google Solar API (keeps API key server-side)
app.get("/api/solar", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Google API key not configured" });

  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch solar data", details: err.message });
  }
});

// Get the Google API key for client-side Maps (restricted key recommended)
app.get("/api/config", (req, res) => {
  res.json({
    googleApiKey: process.env.GOOGLE_API_KEY || "",
  });
});

// Get pricing config
app.get("/api/pricing", (req, res) => {
  const pricing = JSON.parse(
    fs.readFileSync(path.join(__dirname, "config", "pricing.json"), "utf-8")
  );
  res.json(pricing);
});

// Update pricing config (admin)
app.put("/api/pricing", (req, res) => {
  const pricingPath = path.join(__dirname, "config", "pricing.json");
  fs.writeFileSync(pricingPath, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// Lead capture
app.post("/api/leads", (req, res) => {
  const leadsPath = path.join(__dirname, "data", "leads.json");
  let leads = [];
  if (fs.existsSync(leadsPath)) {
    leads = JSON.parse(fs.readFileSync(leadsPath, "utf-8"));
  } else {
    fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
  }
  const lead = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  leads.push(lead);
  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
  res.json({ success: true, lead });
});

// Admin page
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Roofing Calculator server running on http://localhost:${PORT}`);
});
