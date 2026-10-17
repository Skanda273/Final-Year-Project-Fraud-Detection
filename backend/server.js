const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const transactionRoutes = require('./routes/transactionRoutes');
const authRoutes = require('./routes/authRoutes');
const currencyRoutes = require('./routes/currencyRoutes');

dotenv.config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes(io));
app.use('/api/v1/currency', currencyRoutes(io));

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud_detection';
mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        
        // Seed some sample "real" transactions if database is empty
        const Transaction = require('./models/Transaction');
        const count = await Transaction.countDocuments();
        
        // Always ensure the user's specific test ID is present
        await Transaction.findOneAndUpdate(
            { tx_id: 'T2604251843237101268406' },
            { 
                tx_id: 'T2604251843237101268406', 
                type: 'UPI (PhonePe)', 
                amount: 30, 
                user_id: 'SHREE_SKANDA_V', 
                timestamp: new Date(), 
                distance: 2, 
                analysis: { is_fraud: false, risk_score: 0.02, reasons: ["Consistent user pattern"] } 
            },
            { upsert: true }
        );

        if (count === 0) {
            console.log('Seeding additional sample transactions...');
            await Transaction.insertMany([
                { tx_id: 'TXN-98765', type: 'CREDIT_CARD', amount: 4500, user_id: 'USER_88', timestamp: new Date(), distance: 12, analysis: { is_fraud: false, risk_score: 0.1, reasons: [] } },
                { tx_id: 'TXN-54321', type: 'UPI', amount: 15000, user_id: 'USER_42', timestamp: new Date(), distance: 450, analysis: { is_fraud: true, risk_score: 0.95, reasons: ["High amount", "Large distance"] } },
                { tx_id: 'TXN-11223', type: 'DEBIT_CARD', amount: 50, user_id: 'USER_99', timestamp: new Date(), distance: 1, analysis: { is_fraud: false, risk_score: 0.01, reasons: [] } }
            ]);
        }
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Backend Gateway running on port ${PORT}`);
});
