const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40
    },
    eventType: {
      type: String,
      required: true,
      enum: ["GATE_SENSOR_TEST"],
      default: "GATE_SENSOR_TEST"
    },
    status: {
      type: String,
      enum: ["ALERT"],
      default: "ALERT"
    },
    source: {
      type: String,
      enum: ["WOKWI", "MANUAL_TEST"],
      default: "WOKWI"
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
