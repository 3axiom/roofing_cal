require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("google-auth-library");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Service Account Auth for Solar API ---
// Uses key file locally, or Application Default Credentials on Cloud Run
const saKeyPath = path.join(__dirname, "config", "service-account.json");
const authOptions = { scopes: ["https://www.googleapis.com/auth/cloud-platform"] };
if (fs.existsSync(saKeyPath)) {
  authOptions.keyFile = saKeyPath;
}
const solarAuth = new GoogleAuth(authOptions);

// --- API Routes ---

// Proxy: Google Solar API (authenticated via service account)
app.get("/api/solar", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });

  const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH`;

  try {
    const client = await solarAuth.getClient();
    const response = await client.request({ url });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data || { error: "Failed to fetch solar data", details: err.message };
    res.status(status).json(data);
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
