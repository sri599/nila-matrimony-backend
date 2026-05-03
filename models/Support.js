const mongoose = require("mongoose");

const SupportSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Support", SupportSchema);