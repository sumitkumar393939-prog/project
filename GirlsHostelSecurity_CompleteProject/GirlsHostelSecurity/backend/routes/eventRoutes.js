const express = require("express");
const Event = require("../models/Event");
const { requireDevice, requireDashboard } = require("../middleware/auth");

const router = express.Router();

// Device submits a simulated event.
router.post("/", requireDevice, async (req, res, next) => {
  try {
    const { deviceId, eventType, status, source } = req.body || {};

    if (!deviceId || typeof deviceId !== "string" || deviceId.length > 40) {
      return res.status(400).json({ message: "A valid deviceId is required" });
    }
    if (eventType !== "GATE_SENSOR_TEST") {
      return res.status(400).json({ message: "Unsupported demo event type" });
    }

    const event = await Event.create({
      deviceId,
      eventType,
      status: status === "ALERT" ? "ALERT" : "ALERT",
      source: source === "MANUAL_TEST" ? "MANUAL_TEST" : "WOKWI"
    });

    req.app.get("io").emit("new-event", event);

    // Do not delay the API response while an email provider responds.
    const sendEmail = req.app.get("sendAlertEmail");
    if (sendEmail) {
      sendEmail(event).catch((err) => {
        console.error("Email notification failed:", err.message);
      });
    }

    return res.status(201).json({
      message: "Demo event saved",
      event
    });
  } catch (error) {
    next(error);
  }
});

// Dashboard-only routes.
router.get("/", requireDashboard, async (req, res, next) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/acknowledge", requireDashboard, async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true, acknowledgedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!event) return res.status(404).json({ message: "Event not found" });

    req.app.get("io").emit("event-updated", event);
    res.json({ message: "Event marked as reviewed", event });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
