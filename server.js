require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { GoogleAuth } = require("google-auth-library");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "roofing-calc-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);
app.use(express.static(path.join(__dirname, "public")));

// --- Admin credentials from env (hash password on first run) ---
const ADMIN_USER = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "admin123";

// --- Auth middleware ---
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// --- Service Account Auth for Solar API ---
// Uses key file locally, or Application Default Credentials on Cloud Run
const saKeyPath = path.join(__dirname, "config", "service-account.json");
const authOptions = { scopes: ["https://www.googleapis.com/auth/cloud-platform"] };
if (fs.existsSync(saKeyPath)) {
  authOptions.keyFile = saKeyPath;
}
const solarAuth = new GoogleAuth(authOptions);

// --- Auth Routes ---

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.authenticated = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Invalid username or password" });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get("/api/auth/check", (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

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

// Update pricing config (admin — protected)
app.put("/api/pricing", requireAuth, (req, res) => {
  const pricingPath = path.join(__dirname, "config", "pricing.json");
  fs.writeFileSync(pricingPath, JSON.stringify(req.body, null, 2));
  res.json({ success: true });
});

// Lead capture (public)
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

// Get leads (admin — protected)
app.get("/api/leads", requireAuth, (req, res) => {
  const leadsPath = path.join(__dirname, "data", "leads.json");
  if (!fs.existsSync(leadsPath)) {
    return res.json([]);
  }
  const leads = JSON.parse(fs.readFileSync(leadsPath, "utf-8"));
  // Return newest first
  res.json(leads.reverse());
});

// Delete a lead (admin — protected)
app.delete("/api/leads/:id", requireAuth, (req, res) => {
  const leadsPath = path.join(__dirname, "data", "leads.json");
  if (!fs.existsSync(leadsPath)) {
    return res.status(404).json({ error: "Lead not found" });
  }
  let leads = JSON.parse(fs.readFileSync(leadsPath, "utf-8"));
  const id = parseInt(req.params.id);
  leads = leads.filter((l) => l.id !== id);
  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
  res.json({ success: true });
});

// Admin page
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Roofing Calculator server running on http://localhost:${PORT}`);
});
