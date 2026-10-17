const mongoose = require('mongoose');

const CurrencyNoteSchema = new mongoose.Schema({
    note_id: { type: String, required: true, unique: true, index: true },
    filename: { type: String, required: true, index: true },
    label: { type: String, required: true },
    is_fake: { type: Boolean, required: true },
    prediction: { type: String, required: true },
    denomination: { type: String },
    confidence: { type: Number },
    risk_score: { type: Number },
    md5_hash: { type: String, index: true },
    phash: { type: String, index: true },
    resolution: { type: String },
    security_features: {
        intaglio_relief_detected: { type: Boolean, default: true },
        watermark_detected: { type: Boolean, default: true },
        security_thread_continuity: { type: Boolean, default: true },
        microprinting_quality: { type: Boolean, default: true }
    },
    forensic_notes: [String],
    file_path: { type: String }
}, { strict: false });

module.exports = mongoose.model('CurrencyNote', CurrencyNoteSchema, 'currency_notes');
