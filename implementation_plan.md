# Implementation Plan: Unified Financial Fraud Detection System

This plan details the steps to build the foundational web application based on the `fraud_system_architecture.md` design document. We will set up the workspace, initialize the three core services (Frontend, Backend Gateway, and ML Service), and write the core functional code to demonstrate real-time fraud detection.

## User Review Required

> [!IMPORTANT]  
> Please review this plan. Once you approve, I will automatically begin executing these steps.
> **Note on Databases**: We will configure MongoDB via Mongoose in the Node.js backend. If you don't have a local MongoDB instance running, we can temporarily bypass the DB write step or you can provide a MongoDB Atlas connection string. I will initially configure it to connect to `mongodb://localhost:27017/fraud_detection`.

## Open Questions

> [!WARNING]
> 1. Do you have a MongoDB instance running locally, or would you prefer me to mock the database writes for the initial setup?
> 2. Are you okay with starting the React app using Vite (`npm create vite@latest`) with Tailwind CSS?
> 3. Should I set up a Python virtual environment (`venv`) for the Flask ML service?

## Proposed Changes

We will create three main directories in the project root: `frontend`, `backend`, and `ml_service`.

---

### `backend/` (Node.js API Gateway)
We will initialize a Node.js project for the API Gateway.

#### [NEW] `backend/package.json`
Dependencies: `express`, `cors`, `axios`, `socket.io`, `mongoose`, `dotenv`.
#### [NEW] `backend/server.js`
The main Express server setup, configuring CORS, Socket.io for real-time feeds, and routing.
#### [NEW] `backend/models/Transaction.js`
The Mongoose schema for the transactions.
#### [NEW] `backend/routes/transactionRoutes.js`
The `/api/v1/analyze` route that forwards the payload to the ML service and emits WebSocket events.

---

### `ml_service/` (Flask ML Engine)
We will initialize a Python Flask service to handle predictions.

#### [NEW] `ml_service/requirements.txt`
Dependencies: `Flask`, `Flask-Cors`, `numpy`, `scikit-learn`.
#### [NEW] `ml_service/app.py`
The main Flask application exposing `/predict/transaction` and `/predict/currency`. It will include the mock logic provided in the architecture document for demonstration purposes.

---

### `frontend/` (React Dashboard)
We will initialize a React app using Vite and configure Tailwind CSS.

#### [NEW] `frontend/package.json`
Dependencies: `react`, `react-dom`, `socket.io-client`, `recharts`, `lucide-react` (for icons).
#### [NEW] `frontend/tailwind.config.js` & `postcss.config.js`
Tailwind CSS configuration.
#### [NEW] `frontend/src/index.css`
Tailwind imports and custom dark-theme base styles.
#### [NEW] `frontend/src/App.jsx`
The main dashboard component containing the layout, Recharts data visualization, and the real-time WebSocket transaction feed.
#### [NEW] `frontend/src/components/Dashboard.jsx`
The UI component showcasing KPI cards, live risk heatmap, and the live alert stream.

## Verification Plan

### Automated/Manual Verification
1. Run the Flask ML Service on port 8000.
2. Run the Node.js Backend on port 5000.
3. Run the React Frontend on port 5173.
4. Open the React Dashboard in the browser.
5. Send a mock HTTP POST request to the Node.js `/api/v1/analyze` endpoint.
6. Verify that the React Dashboard immediately updates with the new transaction via WebSockets and displays the correct risk score from the ML service.
