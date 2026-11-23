function requireDevice(req, res, next) {
  const token = req.get("x-device-token");
  if (!process.env.DEVICE_TOKEN || token !== process.env.DEVICE_TOKEN) {
    return res.status(401).json({ message: "Invalid device credentials" });
  }
  next();
}

function requireDashboard(req, res, next) {
  const token = req.get("x-dashboard-key");
  if (!process.env.DASHBOARD_API_KEY || token !== process.env.DASHBOARD_API_KEY) {
    return res.status(401).json({ message: "Dashboard authentication required" });
  }
  next();
}

module.exports = { requireDevice, requireDashboard };
