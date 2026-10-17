# System Walkthrough: Unified Financial Fraud Detection System

Welcome to your new enterprise-grade Fraud Detection Platform. This walkthrough explains how the different services interact to provide real-time protection and analytics.

## 1. System Overview

The application is split into three decoupled services:
*   **`frontend/`**: A React dashboard that visualizes data and receives real-time alerts.
*   **`backend/`**: A Node.js API Gateway that manages data persistence and real-time communication via WebSockets.
*   **`ml_service/`**: A Python Flask engine that performs the "heavy lifting" of fraud analysis using Machine Learning models.

---

## 2. The Data Flow (Life of a Transaction)

When a transaction occurs, it follows this path through the system:

1.  **Entry**: A transaction payload is sent to the Backend via `POST /api/v1/transactions/analyze`.
2.  **Preprocessing**: The Backend parses the data and prepares a feature set (amount, distance, time, etc.) for the ML engine.
3.  **Inference**: The Backend calls the **Flask ML Service**. Flask runs the transaction features through the trained model (currently simulated) and calculates a **Risk Score** (0 to 1).
4.  **Persistence**: The Backend receives the score, enriches the transaction object with "Risk Factors" (e.g., "High amount"), and saves it to **MongoDB**.
5.  **Broadcast**: Immediately after saving, the Backend emits a `transaction_processed` event through **Socket.io**.
6.  **Visualization**: The **React Dashboard** receives the event, updates the live charts (Recharts), and pushes a new alert to the "Live Stream" feed.

---

## 3. Key Components Deep-Dive

### 🛡️ The Backend Gateway (`backend/server.js`)
This is the central nervous system. It uses `express` for the API and `socket.io` for the live feed.
*   **Location**: `backend/routes/transactionRoutes.js`
*   **Why it's special**: It handles "graceful degradation." If the ML service is down, it has a fallback logic to ensure the system keeps running while logging the error.

### 🧠 The ML Engine (`ml_service/app.py`)
This service is where the actual intelligence resides. 
*   **Model Logic**: It evaluates features like transaction velocity, geographic distance from home, and time of day.
*   **Explainable AI**: Instead of just saying "Fraud," it returns a list of reasons *why* it was flagged, which is crucial for human investigators.

### 📊 The Command Center (`frontend/src/components/Dashboard.jsx`)
A premium UI designed for high-density information display.
*   **Real-time Charts**: Uses `AreaChart` for risk trends and `BarChart` for transaction volume.
*   **Glassmorphism**: The UI uses semi-transparent panels with backdrop-blur for a modern, high-end feel.
*   **Socket.io Client**: Listens for the `transaction_processed` event to provide zero-latency updates.

---

## 4. How to Test the System

To see the system in action without an external merchant integration, you can send a mock transaction using a tool like **Postman** or **cURL**:

### Test Request (Genuine)
```bash
curl -X POST http://localhost:5000/api/v1/transactions/analyze \
-H "Content-Type: application/json" \
-d '{
  "amount": 150,
  "type": "UPI",
  "user_id": "USER_123",
  "merchant_id": "AMAZON_US"
}'
```

### Test Request (Fraudulent)
```bash
curl -X POST http://localhost:5000/api/v1/transactions/analyze \
-H "Content-Type: application/json" \
-d '{
  "amount": 15000,
  "type": "CREDIT_CARD",
  "distance": 500,
  "velocity": 10
}'
```

Watch your dashboard update instantly as you send these requests!
