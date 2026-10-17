const mongoose = require('mongoose');

const CurrencyScanSchema = new mongoose.Schema({
    scan_id: {
        type: String,
        required: true,
        unique: true
    },
    filename: {
        type: String,
        default: 'currency_note.jpg'
    },
    prediction: {
        type: String,
        enum: ['GENUINE', 'COUNTERFEIT'],
        required: true
    },
    is_fake: {
        type: Boolean,
        required: true
    },
    confidence: {
        type: Number,
        required: true
    },
    risk_score: {
        type: Number,
        required: true
    },
    model_used: {
        type: String,
        default: 'Multi-Spectral Forensic Engine'
    },
    security_features: {
        intaglio_relief_detected: { type: Boolean },
        watermark_detected: { type: Boolean },
        security_thread_continuity: { type: Boolean },
        microprinting_quality: { type: Boolean }
    },
    forensic_notes: [String],
    matched_in_database: {
        type: Boolean,
        default: false
    },
    note_id: String,
    denomination: String,
    image_preview: {
        type: String,
        default: ''
    },
    user_id: {
        type: String,
        default: 'SECURITY_OFFICER'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { strict: false });

module.exports = mongoose.model('CurrencyScan', CurrencyScanSchema);
