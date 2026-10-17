const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    tx_id: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    user_id: { type: String },
    merchant_id: { type: String },
    timestamp: { type: Date, default: Date.now },
    
    // Feature 1: UPI Forensic Fields
    sender_upi: { type: String },
    receiver_upi: { type: String },
    url: { type: String, default: '' },
    otp_shared: { type: Boolean, default: false },
    file_attached: { type: Boolean, default: false },
    
    // Feature 2: Credit / Debit Card Forensic Fields
    card_type: { type: String },
    number: { type: String },
    holder_name: { type: String },
    expiry: { type: String },
    cvv: { type: String },
    is_international: { type: Boolean, default: false },
    
    // Behavioral & Forensic Risk Vectors
    velocity: { type: Number, default: 1 },
    distance: { type: Number, default: 0 },
    time_hour: { type: Number },
    Time: { type: Number },
    
    location: {
        lat: Number,
        lng: Number,
        city: String
    },
    device_info: {
        ip: String,
        browser: String,
        os: String
    },
    analysis: {
        is_fraud: { type: Boolean, default: false },
        risk_score: { type: Number, default: 0.05 },
        reasons: [String],
        model_used: String
    }
}, { strict: false });

module.exports = mongoose.model('Transaction', TransactionSchema);
