const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
    name: { type: String, required: true },
    // durations: {
    //     monthly: { type: Number, required: true },
    //     yearly: { type: Number, required: true }
    // },
    price:Number
});

const Plan = mongoose.model("Plan", planSchema);

module.exports = Plan;