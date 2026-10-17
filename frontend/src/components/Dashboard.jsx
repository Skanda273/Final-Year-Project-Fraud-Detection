import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { 
  ShieldCheck, ShieldAlert, Activity, CreditCard, Smartphone, Wallet, 
  MapPin, Clock, AlertTriangle, CheckCircle2, TrendingUp, History, User,
  Globe, Lock, Zap, Check, X, RefreshCw, Upload, Eye, FileCheck, FileX,
  CheckCircle, XCircle, Image as ImageIcon, Sparkles, Layers, Sliders, Database, Search
} from 'lucide-react';
import { io } from 'socket.io-client';
import { SAMPLE_GENUINE_NOTE, SAMPLE_COUNTERFEIT_NOTE } from '../sampleNotes';

const socket = io('http://localhost:5000');

// Card brand detector
const getCardBrand = (num) => {
  const clean = (num || '').replace(/\D/g, '');
  if (clean.startsWith('4')) return { name: 'VISA', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
  if (/^(5[1-5]|2[2-7])/.test(clean)) return { name: 'MASTERCARD', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' };
  if (/^(60|65|81|82)/.test(clean)) return { name: 'RUPAY', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
  if (/^3[47]/.test(clean)) return { name: 'AMEX', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
  return { name: 'CARD', color: 'text-slate-400 border-slate-700 bg-slate-800' };
};

// Luhn Algorithm Checksum
const isLuhnValid = (num) => {
  const sanitized = (num || '').replace(/\D/g, '');
  if (sanitized.length < 13 || sanitized.length > 19) return false;
  let sum = 0, shouldDouble = false;
  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      if ((digit *= 2) > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

// Helper components
const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="glass-panel p-6 flex flex-col justify-between">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500`}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center gap-1`}>
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1">{value || '0'}</h3>
    </div>
  </div>
);

const TransactionCard = ({ tx }) => {
  if (!tx || !tx.analysis) return null;
  
  return (
    <div 
      className={`p-4 rounded-xl border transition-all ${
        tx.analysis.is_fraud ? 'bg-rose-500/5 neon-border-red' : 'bg-emerald-500/5 neon-border-green'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {tx.type === 'UPI' ? <Smartphone size={16} /> : <CreditCard size={16} />}
          <span className="font-mono text-xs text-slate-400">{tx.tx_id}</span>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
          tx.analysis.is_fraud ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {tx.analysis.is_fraud ? 'Fraud' : 'Genuine'}
        </div>
      </div>
      
      <div className="flex justify-between items-end mt-4">
        <div>
          <p className="text-xl font-bold">₹{(tx.amount || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
            <MapPin size={10} /> {tx.type || 'UNKNOWN'} • {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-slate-500 font-bold">Risk Score</p>
          <p className={`text-lg font-bold ${((tx.analysis.risk_score || 0) * 100) > 70 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {((tx.analysis.risk_score || 0) * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, activeTab, setActiveTab }) => {
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, fraud: 0, volume: 0, riskLevel: 'Low' });
  const [chartData, setChartData] = useState([]);

  // Database Tab States
  const [dbTransactions, setDbTransactions] = useState([]);
  const [dbTotalCount, setDbTotalCount] = useState(0);
  const [dbFilterType, setDbFilterType] = useState('ALL');
  const [dbSearch, setDbSearch] = useState('');
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const loadDbTransactions = async (typeFilter = dbFilterType, searchVal = dbSearch) => {
    const query = (searchVal || '').trim();
    if (!query) {
      setDbTransactions([]);
      setDbTotalCount(0);
      return;
    }
    setIsLoadingDb(true);
    try {
      const q = new URLSearchParams();
      if (typeFilter && typeFilter !== 'ALL') q.set('type', typeFilter);
      q.set('search', query);
      q.set('limit', '50');
      const res = await fetch(`http://localhost:5000/api/v1/transactions?${q.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDbTransactions(json.data);
        setDbTotalCount(json.total || json.data.length);
      } else {
        setDbTransactions([]);
        setDbTotalCount(0);
      }
    } catch (e) {
      console.warn('Failed to load db transactions:', e);
      setDbTransactions([]);
      setDbTotalCount(0);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const handleLoadRecordIntoForensics = (tx) => {
    const isCard = ['CREDIT_CARD', 'DEBIT_CARD', 'CARD'].includes((tx.type || '').toUpperCase());
    if (isCard) {
      setManualType('CARD');
      handleFetchCardById(tx.tx_id);
    } else {
      setManualType('UPI');
      handleFetchUpiById(tx.tx_id);
    }
    setActiveTab('manual-check');
  };

  // Manual Check Form States
  const [manualType, setManualType] = useState('UPI');
  const [cardData, setCardData] = useState({ 
    tx_id: '', 
    card_type: 'CREDIT_CARD', 
    number: '4532750012345678', 
    holder_name: 'PRIYA SHARMA', 
    expiry: '12/28', 
    cvv: '842', 
    amount: '2450', 
    velocity: 1, 
    distance: 5, 
    is_international: false 
  });
  const [upiData, setUpiData] = useState({ tx_id: '', sender_upi: '', receiver_upi: '', amount: '', url: '', otp_shared: false, file_attached: false });

  // MongoDB Auto-fetch States
  const [fetchMessage, setFetchMessage] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [isFetchingDb, setIsFetchingDb] = useState(false);

  // Auto-fetch UPI Transaction from MongoDB by Transaction ID
  const handleFetchUpiById = async (searchId) => {
    const id = (searchId || upiData.tx_id || '').trim();
    if (!id) return;
    setIsFetchingDb(true);
    setFetchMessage('');
    setFetchError('');
    try {
      const res = await fetch(`http://localhost:5000/api/v1/transactions/lookup/${encodeURIComponent(id)}`);
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        const d = result.data;
        setUpiData({
          tx_id: d.tx_id || id,
          sender_upi: d.sender_upi || d.user_id || '',
          receiver_upi: d.receiver_upi || d.merchant_id || '',
          amount: d.amount !== undefined ? String(d.amount) : '',
          url: d.url || '',
          otp_shared: Boolean(d.otp_shared),
          file_attached: Boolean(d.file_attached)
        });
        setFetchMessage(`✅ Auto-filled all fields from MongoDB for Ref: ${d.tx_id}`);
      } else {
        setFetchError(result.message || `Transaction Ref '${id}' not found in MongoDB.`);
      }
    } catch (e) {
      setFetchError('Unable to connect to MongoDB / backend service.');
    } finally {
      setIsFetchingDb(false);
    }
  };

  // Auto-fetch Card Transaction from MongoDB by Transaction ID
  const handleFetchCardById = async (searchId) => {
    const id = (searchId || cardData.tx_id || '').trim();
    if (!id) return;
    setIsFetchingDb(true);
    setFetchMessage('');
    setFetchError('');
    try {
      const res = await fetch(`http://localhost:5000/api/v1/transactions/lookup/${encodeURIComponent(id)}`);
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        const d = result.data;
        const pca = {};
        for (let i = 1; i <= 28; i++) {
          if (d[`V${i}`] !== undefined) pca[`V${i}`] = d[`V${i}`];
        }
        setCardData({
          tx_id: d.tx_id || id,
          card_type: d.card_type || d.type || 'CREDIT_CARD',
          number: d.number || '',
          holder_name: d.holder_name || '',
          expiry: d.expiry || '',
          cvv: d.cvv || '',
          amount: d.amount !== undefined ? String(d.amount) : '',
          velocity: d.velocity || 1,
          distance: d.distance || 0,
          is_international: Boolean(d.is_international),
          Time: d.Time,
          ...pca
        });
        setFetchMessage(`✅ Auto-filled all fields from MongoDB for Card Ref: ${d.tx_id}`);
      } else {
        setFetchError(result.message || `Card Ref '${id}' not found in MongoDB.`);
      }
    } catch (e) {
      setFetchError('Unable to connect to MongoDB / backend service.');
    } finally {
      setIsFetchingDb(false);
    }
  };

  // Quick Preset Handlers from MongoDB
  const handleLoadUpiPreset = async (presetType) => {
    if (presetType === 'legit') {
      await handleFetchUpiById('UPI241047338124');
    } else if (presetType === 'fraud_phishing') {
      await handleFetchUpiById('T241016251282538206');
    }
  };

  const handleLoadCardPresetDb = async (presetType) => {
    if (presetType === 'legit') {
      await handleFetchCardById('CARD-2410-0002');
    } else if (presetType === 'fraud') {
      await handleFetchCardById('CARD-2410-0001');
    }
  };

  // Feature 3: Vision Module (Fake Currency Detection) States
  const [currencyPreview, setCurrencyPreview] = useState(null);
  const [currencyFilename, setCurrencyFilename] = useState('');
  const [isScanningCurrency, setIsScanningCurrency] = useState(false);
  const [currencyScanStep, setCurrencyScanStep] = useState('');
  const [currencyResult, setCurrencyResult] = useState(null);
  const [currencyError, setCurrencyError] = useState('');
  const [currencyHistory, setCurrencyHistory] = useState([]);

  const loadCardPreset = (preset) => {
    setError('');
    setLastScanResult(null);
    if (preset === 'normal') {
      setCardData({
        tx_id: `CARD-${Date.now().toString().slice(-6)}`,
        card_type: 'DEBIT_CARD',
        number: '4532750012345678',
        holder_name: 'PRIYA SHARMA',
        expiry: '09/27',
        cvv: '512',
        amount: '1850',
        velocity: 1,
        distance: 4,
        is_international: false
      });
    } else if (preset === 'velocity_fraud') {
      setCardData({
        tx_id: `CARD-${Date.now().toString().slice(-6)}`,
        card_type: 'CREDIT_CARD',
        number: '5412751234567890',
        holder_name: 'UNKNOWN SWIPER',
        expiry: '04/26',
        cvv: '993',
        amount: '89000',
        velocity: 8,
        distance: 420,
        is_international: true
      });
    } else if (preset === 'luhn_fail') {
      setCardData({
        tx_id: `CARD-${Date.now().toString().slice(-6)}`,
        card_type: 'CREDIT_CARD',
        number: '4532750012345679',
        holder_name: 'COUNTERFEIT CLONE',
        expiry: '11/29',
        cvv: '123',
        amount: '45000',
        velocity: 3,
        distance: 150,
        is_international: false
      });
    } else if (preset === 'pca_fraud') {
      setCardData({
        tx_id: `CC-PCA-${Date.now().toString().slice(-4)}`,
        card_type: 'CREDIT_CARD',
        number: '4111111111111111',
        holder_name: 'KAGGLE DATASET ANOMALY',
        expiry: '08/28',
        cvv: '442',
        amount: '529.00',
        velocity: 6,
        distance: 310,
        is_international: true,
        Time: 406,
        V1: -2.312226542,
        V2: 1.951992011,
        V3: -1.609850732,
        V4: 3.997905588,
        V10: -2.772272145,
        V12: -2.899907388,
        V14: -4.289253782,
        V17: -2.830055675
      });
    }
  };

  // Camera States
  const videoRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [lastScanResult, setLastScanResult] = useState(null);

  const updateDashboardData = (data) => {
    if (!data || !data.analysis) return;
    setTransactions(prev => [data, ...prev].slice(0, 15));
    setStats(prev => {
      const newTotal = (prev.total || 0) + 1;
      const newFraud = data.analysis.is_fraud ? (prev.fraud || 0) + 1 : (prev.fraud || 0);
      const newVolume = (prev.volume || 0) + (data.amount || 0);
      const ratio = newFraud / newTotal;
      return { total: newTotal, fraud: newFraud, volume: newVolume, riskLevel: ratio > 0.1 ? 'High' : ratio > 0.03 ? 'Medium' : 'Low' };
    });
    setChartData(prev => [...prev, { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), score: (data.analysis.risk_score || 0) * 100, amount: data.amount || 0 }].slice(-20));
  };

  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    socket.on('transaction_processed', (data) => updateDashboardData(data));
    socket.on('currency_scanned', (scan) => {
      setCurrencyHistory(prev => [scan, ...prev].slice(0, 15));
    });

    // Fetch initial currency audit history
    fetch('http://localhost:5000/api/v1/currency/history')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setCurrencyHistory(resData.data);
        }
      })
      .catch(() => {});

    const timer = setTimeout(() => setShowWelcome(false), 5000);
    return () => {
      socket.off('transaction_processed');
      socket.off('currency_scanned');
      clearTimeout(timer);
    };
  }, []);

  // Database tab: do NOT auto-load — only load when user searches or clicks Refresh

  // Currency Note Handlers
  const handleCurrencyFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCurrencyError('Invalid file format. Please upload a clear JPG, PNG, or WEBP image of a currency note.');
      return;
    }
    setCurrencyError('');
    setCurrencyResult(null);
    setCurrencyFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => setCurrencyPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const loadPresetCurrency = (type) => {
    setCurrencyError('');
    setCurrencyResult(null);
    if (type === 'genuine') {
      setCurrencyPreview(SAMPLE_GENUINE_NOTE);
      setCurrencyFilename('sample_genuine_note_500.jpg');
    } else {
      setCurrencyPreview(SAMPLE_COUNTERFEIT_NOTE);
      setCurrencyFilename('sample_counterfeit_photocopy_500.jpg');
    }
  };

  const handleAnalyzeCurrency = async () => {
    if (!currencyPreview) {
      setCurrencyError('Please select or upload a currency note image to scan.');
      return;
    }
    setCurrencyError('');
    setIsScanningCurrency(true);
    setCurrencyScanStep('Initiating Optical Substrate Scan (224x224 RGB)...');

    try {
      await new Promise(r => setTimeout(r, 600));
      setCurrencyScanStep('Inspecting Intaglio Raised Relief & Micro-Edges...');
      await new Promise(r => setTimeout(r, 600));
      setCurrencyScanStep('Verifying Watermark Pulp Density & Security Thread...');
      await new Promise(r => setTimeout(r, 600));
      setCurrencyScanStep('Executing Deep Convolutional Neural Network (CNN)...');

      const response = await fetch('http://localhost:5000/api/v1/currency/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: currencyPreview,
          filename: currencyFilename || 'banknote_scan.jpg',
          user_id: user?.username || 'ADMIN'
        })
      });

      const resJson = await response.json();
      if (response.ok && resJson.success) {
        setCurrencyResult(resJson.data);
        setCurrencyHistory(prev => [resJson.data, ...prev].slice(0, 15));
      } else {
        setCurrencyError(resJson.message || resJson.error || 'Forensic currency scan could not process the image.');
      }
    } catch (err) {
      setCurrencyError('Connection error: Unable to communicate with Security Gateway / ML Service.');
    } finally {
      setIsScanningCurrency(false);
      setCurrencyScanStep('');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLastScanResult(null);
    setScanStatus(`Analyzing forensic security patterns...`);
    try {
      await new Promise(r => setTimeout(r, 1200));
      const payload = manualType === 'CARD' 
        ? { 
            type: cardData.card_type || 'CREDIT_CARD', 
            card_type: cardData.card_type || 'CREDIT_CARD',
            ...cardData, 
            amount: cardData.amount ? parseFloat(cardData.amount) : 0,
            distance: cardData.distance ? parseFloat(cardData.distance) : 0,
            velocity: cardData.velocity ? parseInt(cardData.velocity, 10) : 1
          }
        : { type: 'UPI', ...upiData, amount: upiData.amount ? parseFloat(upiData.amount) : undefined };
      
      const response = await fetch('http://localhost:5000/api/v1/transactions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (response.ok && result.success) {
        updateDashboardData(result.data);
        setLastScanResult(result.data);
      } else {
        setError(result.error || 'Forensic Analysis Failed');
      }
    } catch (err) {
      setError('Connection to security gateway lost.');
    } finally {
      setScanStatus('');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {showWelcome && (
        <div className="flex items-center gap-4 mb-2 p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl animate-in slide-in-from-top-4 fade-in duration-700">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20"><ShieldCheck size={24} /></div>
          <div>
            <h2 className="text-lg font-bold text-white leading-none">Welcome back, {user?.username}!</h2>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">System Status: <span className="text-emerald-500">Secure • {user?.role} Access</span></p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Unified Financial <span className="text-blue-500">Fraud Detection System</span></h1>
          <p className="text-slate-400 mt-1">Enterprise-grade security monitoring & analytics</p>
        </div>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Total Transactions" value={stats.total} icon={Activity} color="blue" trend="+12%" />
              <StatCard title="Fraud Detected" value={stats.fraud} icon={ShieldAlert} color="rose" trend="+2%" />
              <StatCard title="Total Volume" value={`₹${stats.volume.toLocaleString('en-IN')}`} icon={Wallet} color="emerald" trend="+18%" />
              <StatCard title="Risk Level" value={stats.riskLevel} icon={AlertTriangle} color={stats.riskLevel === 'High' ? 'rose' : stats.riskLevel === 'Medium' ? 'amber' : 'emerald'} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-panel p-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-6"><Activity className="text-blue-500" /> Risk Velocity</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs><linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fill="url(#riskGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-panel p-6 overflow-hidden flex flex-col">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Clock className="text-blue-500" /> Live Event Log</h3>
                <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {transactions.map((tx, i) => <TransactionCard key={i} tx={tx} />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'manual-check' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500 max-w-4xl mx-auto">
            <div className="glass-panel overflow-hidden">
              <div className="bg-blue-600/10 p-8 border-b border-blue-500/10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                    <ShieldCheck className="text-blue-500" /> 
                    {manualType === 'CARD' ? 'Card Forensic Analysis' : 'UPI Forensic Analysis'}
                  </h2>
                  <div className="flex p-1 bg-slate-950 rounded-lg border border-slate-800">
                    <button onClick={() => setManualType('CARD')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${manualType === 'CARD' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>CARD</button>
                    <button onClick={() => setManualType('UPI')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${manualType === 'UPI' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>UPI</button>
                  </div>
                </div>

                <div className="relative min-h-[400px]">
                  {manualType === 'CARD' ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                      {/* Presets Bar */}
                      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 mr-2">
                          <Database size={13} className="text-blue-400" /> MongoDB Dataset:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleLoadCardPresetDb('legit')}
                          className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 font-medium transition-all"
                        >
                          📦 CARD-2410-0002 (Legit)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadCardPresetDb('fraud')}
                          className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 font-medium transition-all"
                        >
                          📦 CARD-2410-0001 (Fraud)
                        </button>
                        <span className="text-slate-600 hidden sm:inline">|</span>
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <Zap size={13} className="text-amber-400" /> Fast Presets:
                        </span>
                        <button
                          type="button"
                          onClick={() => loadCardPreset('normal')}
                          className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-medium transition-all"
                        >
                          🟢 Normal Swipe
                        </button>
                        <button
                          type="button"
                          onClick={() => loadCardPreset('velocity_fraud')}
                          className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 font-medium transition-all"
                        >
                          🔴 High Velocity
                        </button>
                        <button
                          type="button"
                          onClick={() => loadCardPreset('luhn_fail')}
                          className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-medium transition-all"
                        >
                          ⚠️ Luhn Fail
                        </button>
                      </div>

                      {fetchMessage && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-400 flex items-center justify-between animate-in fade-in">
                          <span className="flex items-center gap-2"><Database size={14} /> {fetchMessage}</span>
                          <button type="button" onClick={() => setFetchMessage('')} className="text-slate-400 hover:text-white"><X size={12} /></button>
                        </div>
                      )}
                      {fetchError && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 flex items-center justify-between animate-in fade-in">
                          <span className="flex items-center gap-2"><AlertTriangle size={14} /> {fetchError}</span>
                          <button type="button" onClick={() => setFetchError('')} className="text-slate-400 hover:text-white"><X size={12} /></button>
                        </div>
                      )}

                      <form onSubmit={handleManualSubmit} className="space-y-6 text-white">
                        {/* Interactive Card Preview */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border border-blue-500/20 shadow-2xl relative overflow-hidden">
                          <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-2">
                              <CreditCard className="text-blue-400" size={24} />
                              <span className="text-xs font-mono font-bold tracking-widest text-slate-400">
                                {cardData.card_type === 'DEBIT_CARD' ? 'DEBIT SECURE' : 'CREDIT PLATINUM'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider border ${getCardBrand(cardData.number).color}`}>
                                {getCardBrand(cardData.number).name}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                                isLuhnValid(cardData.number) 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}>
                                {isLuhnValid(cardData.number) ? <Check size={11} /> : <X size={11} />}
                                Luhn: {isLuhnValid(cardData.number) ? 'Valid' : 'Invalid'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="font-mono text-xl md:text-2xl tracking-[0.25em] text-white">
                              {cardData.number ? cardData.number.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                            </div>

                            <div className="flex justify-between items-end text-xs text-slate-400 pt-2">
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-slate-500">Cardholder</p>
                                <p className="font-medium text-slate-200 uppercase mt-0.5">{cardData.holder_name || 'VALUED CUSTOMER'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] uppercase tracking-widest text-slate-500">Expires</p>
                                <p className="font-mono font-medium text-slate-200 mt-0.5">{cardData.expiry || 'MM/YY'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Input Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5 md:col-span-3">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">Card Transaction ID / Reference (MongoDB)</label>
                              <span className="text-[10px] text-blue-400 flex items-center gap-1"><Database size={11} /> Auto-Fetches from Dataset</span>
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="e.g. CARD-2410-0001 (Press Enter or click Fetch to populate from MongoDB)" 
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 font-mono text-sm" 
                                value={cardData.tx_id || ''} 
                                onChange={e => setCardData({...cardData, tx_id: e.target.value})}
                                onBlur={() => cardData.tx_id && handleFetchCardById(cardData.tx_id)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchCardById(cardData.tx_id); }}}
                              />
                              <button
                                type="button"
                                onClick={() => handleFetchCardById(cardData.tx_id)}
                                disabled={isFetchingDb || !cardData.tx_id}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-blue-900/20"
                              >
                                <Database size={14} className={isFetchingDb ? 'animate-spin' : ''} />
                                Auto-Fetch
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">Card Number (16 Digits)</label>
                            <input 
                              type="text" 
                              maxLength={19}
                              placeholder="4532 7500 1234 5678" 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 font-mono text-sm" 
                              value={cardData.number || ''} 
                              onChange={e => setCardData({...cardData, number: e.target.value.replace(/\s+/g, '')})} 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">Card Type</label>
                            <select 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 text-sm font-medium"
                              value={cardData.card_type}
                              onChange={e => setCardData({...cardData, card_type: e.target.value})}
                            >
                              <option value="CREDIT_CARD">Credit Card</option>
                              <option value="DEBIT_CARD">Debit Card</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">Cardholder Name</label>
                            <input 
                              type="text" 
                              placeholder="Name on card" 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 text-sm uppercase" 
                              value={cardData.holder_name || ''} 
                              onChange={e => setCardData({...cardData, holder_name: e.target.value})} 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">Expiry (MM/YY)</label>
                            <input 
                              type="text" 
                              maxLength={5}
                              placeholder="12/28" 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 text-sm font-mono text-center" 
                              value={cardData.expiry || ''} 
                              onChange={e => setCardData({...cardData, expiry: e.target.value})} 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">CVV Security Code</label>
                            <input 
                              type="password" 
                              maxLength={4}
                              placeholder="•••" 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 text-sm font-mono text-center" 
                              value={cardData.cvv || ''} 
                              onChange={e => setCardData({...cardData, cvv: e.target.value})} 
                            />
                          </div>
                        </div>

                        {/* Transaction Context & Behavioral Features */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/60">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">Transaction Amount (INR)</label>
                            <input 
                              type="number" 
                              placeholder="₹ Amount" 
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 font-bold text-sm" 
                              value={cardData.amount || ''} 
                              onChange={e => setCardData({...cardData, amount: e.target.value})} 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">
                              Velocity ({cardData.velocity || 1} swipes / 10m)
                            </label>
                            <input 
                              type="range" 
                              min="1" 
                              max="10" 
                              className="w-full mt-3 accent-blue-500" 
                              value={cardData.velocity || 1} 
                              onChange={e => setCardData({...cardData, velocity: parseInt(e.target.value, 10)})} 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">
                              Distance ({cardData.distance || 0} km from Home)
                            </label>
                            <input 
                              type="range" 
                              min="0" 
                              max="500" 
                              step="10"
                              className="w-full mt-3 accent-blue-500" 
                              value={cardData.distance || 0} 
                              onChange={e => setCardData({...cardData, distance: parseFloat(e.target.value)})} 
                            />
                          </div>
                        </div>

                        {/* International Swipe Toggle */}
                        <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-2">
                            <Globe size={18} className="text-blue-400" />
                            <div>
                              <p className="text-xs font-bold text-slate-200">Cross-Border / International Swipe</p>
                              <p className="text-[10px] text-slate-400">Card terminal detected outside domestic perimeter</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCardData({...cardData, is_international: !cardData.is_international})}
                            className={`w-12 h-6 rounded-full relative transition-all ${cardData.is_international ? 'bg-blue-600' : 'bg-slate-800'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${cardData.is_international ? 'right-1' : 'left-1'}`} />
                          </button>
                        </div>

                        {/* Submit Button */}
                        <button 
                          type="submit" 
                          disabled={scanStatus} 
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:bg-slate-800 py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all"
                        >
                          <ShieldAlert size={18} className={scanStatus ? 'animate-spin' : ''} />
                          {scanStatus || 'Run Random Forest & SVM Fraud Analysis'}
                        </button>
                      </form>

                      {/* Card Forensic Results */}
                      <div className="space-y-4 pt-2">
                        {error && (
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                            <AlertTriangle size={16} /> {error}
                          </div>
                        )}
                        {lastScanResult && (
                          <div className="animate-in fade-in zoom-in-95 p-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-2xl shadow-xl">
                            <div className="bg-slate-950 rounded-[14px] p-6 space-y-6">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                                    <ShieldCheck className="text-blue-500" /> Card Forensic Verification
                                  </h3>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    Model Engine: <span className="text-blue-400 font-semibold">{lastScanResult.analysis?.model_used || 'Random Forest + SVM'}</span>
                                  </p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                                  lastScanResult.analysis?.is_fraud ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                                }`}>
                                  {lastScanResult.analysis?.is_fraud ? 'Threat Detected' : 'Verified Secure'}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Risk Score</p>
                                  <p className={`text-lg font-black ${
                                    lastScanResult.analysis?.is_fraud ? 'text-rose-500' : 'text-emerald-500'
                                  }`}>
                                    {((lastScanResult.analysis?.risk_score || 0) * 100).toFixed(1)}%
                                  </p>
                                </div>
                                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Amount</p>
                                  <p className="text-lg font-bold text-white">
                                    ₹{lastScanResult.amount?.toLocaleString('en-IN')}
                                  </p>
                                </div>
                                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Card Security</p>
                                  <p className="text-xs font-bold text-blue-400 mt-1">
                                    {isLuhnValid(cardData.number) ? 'Luhn Verified' : 'Luhn Failed'}
                                  </p>
                                </div>
                                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Decision</p>
                                  <p className={`text-xs font-black uppercase mt-1 ${
                                    lastScanResult.analysis?.is_fraud ? 'text-rose-400' : 'text-emerald-400'
                                  }`}>
                                    {lastScanResult.analysis?.is_fraud ? 'TRANSACTION BLOCKED' : 'APPROVED'}
                                  </p>
                                </div>
                              </div>

                              {/* Explainable AI Risk Factors */}
                              <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                  <Activity size={12} className="text-blue-400" /> Explainable AI Risk Factors:
                                </p>
                                <div className="space-y-1.5">
                                  {(lastScanResult.analysis?.reasons && lastScanResult.analysis.reasons.length > 0) ? (
                                    lastScanResult.analysis.reasons.map((reason, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                        <span>{reason}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                                      <CheckCircle2 size={13} />
                                      <span>All neural and behavioral vectors within standard baseline.</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* UPI Presets Bar */}
                      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs mb-6">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 mr-2">
                          <Database size={13} className="text-blue-400" /> MongoDB Dataset Samples:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleLoadUpiPreset('legit')}
                          className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 font-medium transition-all flex items-center gap-1"
                        >
                          📦 UPI241047338124 (Zomato Legit)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLoadUpiPreset('fraud_phishing')}
                          className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 font-medium transition-all flex items-center gap-1"
                        >
                          📦 T241016251282538206 (Phishing + OTP Fraud)
                        </button>
                      </div>

                      {fetchMessage && (
                        <div className="p-3 mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-400 flex items-center justify-between animate-in fade-in">
                          <span className="flex items-center gap-2"><Database size={14} /> {fetchMessage}</span>
                          <button type="button" onClick={() => setFetchMessage('')} className="text-slate-400 hover:text-white"><X size={12} /></button>
                        </div>
                      )}
                      {fetchError && (
                        <div className="p-3 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 flex items-center justify-between animate-in fade-in">
                          <span className="flex items-center gap-2"><AlertTriangle size={14} /> {fetchError}</span>
                          <button type="button" onClick={() => setFetchError('')} className="text-slate-400 hover:text-white"><X size={12} /></button>
                        </div>
                      )}

                      <form onSubmit={handleManualSubmit} className="space-y-8 text-white animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 md:col-span-2">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest ml-1">Ref ID / Transaction ID (MongoDB)</label>
                                <span className="text-[10px] text-blue-400 flex items-center gap-1"><Database size={11} /> Auto-Fetches from Dataset</span>
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  placeholder="e.g. T241016251282538206 or UPI241047338124 (Press Enter or click Fetch)" 
                                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 font-mono text-sm" 
                                  value={upiData.tx_id || ''} 
                                  onChange={e => setUpiData({...upiData, tx_id: e.target.value})} 
                                  onBlur={() => upiData.tx_id && handleFetchUpiById(upiData.tx_id)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleFetchUpiById(upiData.tx_id); }}}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleFetchUpiById(upiData.tx_id)}
                                  disabled={isFetchingDb || !upiData.tx_id}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-blue-900/20"
                                >
                                  <Database size={14} className={isFetchingDb ? 'animate-spin' : ''} />
                                  Auto-Fetch
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Transfer Amount (INR)</label>
                              <input type="number" placeholder="Enter Amount" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50" value={upiData.amount || ''} onChange={e => setUpiData({...upiData, amount: e.target.value})} />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Sender UPI ID (VPA)</label>
                              <input type="text" placeholder="user@upi" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 text-sm" value={upiData.sender_upi || ''} onChange={e => setUpiData({...upiData, sender_upi: e.target.value})} />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Receiver UPI ID (VPA)</label>
                              <input type="text" placeholder="merchant@upi" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/50 text-sm" value={upiData.receiver_upi || ''} onChange={e => setUpiData({...upiData, receiver_upi: e.target.value})} />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Phishing URL / Link Detection</label>
                              <input type="text" placeholder="https://bit.ly/..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs" value={upiData.url || ''} onChange={e => setUpiData({...upiData, url: e.target.value})} />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                              <div><p className="text-[10px] text-slate-500 uppercase font-bold">OTP Sharing Status</p><p className="text-[10px] text-slate-400 italic">Shared with caller?</p></div>
                              <button type="button" onClick={() => setUpiData({...upiData, otp_shared: !upiData.otp_shared})} className={`w-12 h-6 rounded-full relative transition-all ${upiData.otp_shared ? 'bg-rose-500' : 'bg-slate-800'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${upiData.otp_shared ? 'right-1' : 'left-1'}`} /></button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Forensic Evidence (OCR Screenshot)</label>
                            <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:border-blue-500/50 transition-all cursor-pointer bg-blue-500/[0.01]">
                              <input type="file" className="hidden" id="evidence" onChange={() => setUpiData({...upiData, file_attached: true})} />
                              <label htmlFor="evidence" className="cursor-pointer space-y-2">
                                <Smartphone size={24} className="text-slate-600 mx-auto" />
                                <p className="text-xs font-bold text-slate-400">{upiData.file_attached ? '✅ Evidence Attached' : 'Upload Phishing SMS Screenshot'}</p>
                              </label>
                            </div>
                          </div>

                          <button type="submit" disabled={scanStatus} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2">
                            <ShieldAlert size={20} className={scanStatus ? 'animate-spin' : ''} /> {scanStatus || 'Initiate Forensic Scan'}
                          </button>
                        </div>
                      </form>

                      <div className="mt-8 space-y-4">
                        {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-sm flex items-center gap-2 animate-in slide-in-from-top-2"><AlertTriangle size={16} /> {error}</div>}
                        {lastScanResult && (
                          <div className="animate-in fade-in zoom-in-95 p-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl">
                            <div className="bg-slate-950 rounded-[14px] p-6 space-y-6">
                              <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="text-blue-500" /> Scan Results</h3>
                                <div className={`px-4 py-1 rounded-full text-xs font-black uppercase ${lastScanResult.analysis.is_fraud ? 'bg-rose-500' : 'bg-emerald-500'} text-white`}>
                                  {lastScanResult.analysis.is_fraud ? 'Threat Detected' : 'Verified Secure'}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Risk Score</p><p className={`text-sm font-bold ${lastScanResult.analysis.is_fraud ? 'text-rose-500' : 'text-emerald-500'}`}>{((lastScanResult.analysis.risk_score || 0) * 100).toFixed(1)}%</p></div>
                                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Amount</p><p className="text-sm font-bold">₹{lastScanResult.amount?.toLocaleString()}</p></div>
                                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex-1 col-span-2"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Forensic Note</p><p className="text-[10px] text-slate-300 truncate">{lastScanResult.analysis.reasons?.[0] || 'Clean behavioral profile'}</p></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vision' && (
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-8 text-white">
            {/* Vision Header & Quick Presets */}
            <div className="glass-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Eye size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      Currency Optical Forensic Lab
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        CNN Model Active
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Substrate & Security Feature Authenticity Classifier • PyTorch ConvNet (4-Stage)
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Sample Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mr-1">
                  1-Click Presets:
                </span>
                <button
                  type="button"
                  onClick={() => loadPresetCurrency('genuine')}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <CheckCircle2 size={14} /> Genuine Note
                </button>
                <button
                  type="button"
                  onClick={() => loadPresetCurrency('fake')}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <AlertTriangle size={14} /> Counterfeit Photocopy
                </button>
                {currencyPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrencyPreview(null);
                      setCurrencyFilename('');
                      setCurrencyResult(null);
                      setCurrencyError('');
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                    title="Reset note"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Main Inspection Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Banknote Imaging & Scanning Console */}
              <div className="lg:col-span-6 space-y-6">
                <div className="glass-panel p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <ImageIcon className="text-blue-400" size={18} />
                      Banknote Optical Ingestion
                    </h3>
                    <span className="text-xs text-slate-500 font-mono">
                      Input: 224x224 RGB Substrate
                    </span>
                  </div>

                  {/* Upload Dropzone / Image Display */}
                  <div className="relative">
                    <input
                      type="file"
                      id="currency-upload"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      className="hidden"
                      onChange={handleCurrencyFileChange}
                    />

                    {currencyPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 flex flex-col items-center justify-center p-2 group">
                        <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                          <img
                            src={currencyPreview}
                            alt="Banknote Specimen"
                            className="w-full h-full object-contain filter group-hover:brightness-105 transition-all"
                          />

                          {/* Laser Scan Animation Overlay */}
                          {isScanningCurrency && (
                            <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] flex flex-col justify-between pointer-events-none">
                              <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse" />
                              <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_#3b82f6] animate-bounce" />
                            </div>
                          )}

                          {/* Watermark grid overlay badge */}
                          <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-slate-300 border border-slate-800">
                            {currencyFilename || 'Specimen Ingested'}
                          </div>
                        </div>

                        <label
                          htmlFor="currency-upload"
                          className="mt-3 text-xs text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1 font-medium transition-colors"
                        >
                          <Upload size={12} /> Replace Image
                        </label>
                      </div>
                    ) : (
                      <label
                        htmlFor="currency-upload"
                        className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-blue-500/[0.02]"
                      >
                        <div className="p-4 bg-slate-900 rounded-2xl text-blue-400 mb-3 border border-slate-800">
                          <Upload size={28} />
                        </div>
                        <p className="font-semibold text-slate-200 text-sm">
                          Drop currency note photo here or <span className="text-blue-400 underline">Browse</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">
                          Upload high-resolution front/back specimen (JPG, PNG, WEBP). Or click a test preset above.
                        </p>
                      </label>
                    )}
                  </div>

                  {/* Forensic Progress Indicator */}
                  {isScanningCurrency && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-blue-400 flex items-center gap-2">
                          <Sparkles size={14} className="animate-spin text-blue-400" />
                          {currencyScanStep || 'Analyzing Banknote...'}
                        </span>
                        <span className="font-mono text-slate-400">Processing...</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full w-full animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Error Notification */}
                  {currencyError && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2 animate-in slide-in-from-top-1">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span>{currencyError}</span>
                    </div>
                  )}

                  {/* Analyze CTA */}
                  <button
                    type="button"
                    onClick={handleAnalyzeCurrency}
                    disabled={isScanningCurrency || !currencyPreview}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2"
                  >
                    {isScanningCurrency ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Running CNN & Forensic Filters...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        Run Fake Currency Detection Scan
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Forensic Intelligence & Analysis Report */}
              <div className="lg:col-span-6 space-y-6">
                {currencyResult ? (
                  <div className={`glass-panel p-6 space-y-6 border ${
                    currencyResult.is_fake ? 'neon-border-red bg-rose-500/[0.03]' : 'neon-border-green bg-emerald-500/[0.03]'
                  } animate-in fade-in zoom-in-95`}>
                    {/* Verdict Banner */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                          Forensic Inspection Verdict
                        </span>
                        <h3 className={`text-2xl font-black mt-1 flex items-center gap-2.5 ${
                          currencyResult.is_fake ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {currencyResult.is_fake ? (
                            <>
                              <XCircle size={28} className="text-rose-400" />
                              COUNTERFEIT DETECTED
                            </>
                          ) : (
                            <>
                              <CheckCircle size={28} className="text-emerald-400" />
                              GENUINE CURRENCY VERIFIED
                            </>
                          )}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          Scan Reference: {currencyResult.scan_id || 'SCAN-AUTO'}
                        </p>
                      </div>

                      <div className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        currencyResult.is_fake ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {currencyResult.prediction}
                      </div>
                    </div>

                    {/* Metric Gauges */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Confidence</p>
                        <p className="text-lg font-black text-slate-200 mt-1">
                          {((currencyResult.confidence || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Risk Score</p>
                        <p className={`text-lg font-black mt-1 ${
                          currencyResult.is_fake ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {((currencyResult.risk_score || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Engine</p>
                        <p className="text-xs font-bold text-blue-400 mt-2 font-mono truncate">
                          PyTorch CNN
                        </p>
                      </div>
                    </div>

                    {/* Security Feature Checklist */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Sliders size={14} className="text-blue-400" />
                        Substrate Security Verification Checklist
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          currencyResult.security_features?.watermark_detected
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/5 border-rose-500/30 text-rose-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {currencyResult.security_features?.watermark_detected ? (
                              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                            )}
                            <span className="font-medium">Watermark Pulp Gradient</span>
                          </div>
                          <span className="text-[10px] font-bold font-mono">
                            {currencyResult.security_features?.watermark_detected ? 'PASS' : 'FAIL'}
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          currencyResult.security_features?.intaglio_relief_detected
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/5 border-rose-500/30 text-rose-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {currencyResult.security_features?.intaglio_relief_detected ? (
                              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                            )}
                            <span className="font-medium">Intaglio Tactile Relief</span>
                          </div>
                          <span className="text-[10px] font-bold font-mono">
                            {currencyResult.security_features?.intaglio_relief_detected ? 'PASS' : 'FAIL'}
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          currencyResult.security_features?.security_thread_continuity
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/5 border-rose-500/30 text-rose-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {currencyResult.security_features?.security_thread_continuity ? (
                              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                            )}
                            <span className="font-medium">Metallic Security Thread</span>
                          </div>
                          <span className="text-[10px] font-bold font-mono">
                            {currencyResult.security_features?.security_thread_continuity ? 'PASS' : 'FAIL'}
                          </span>
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center justify-between ${
                          currencyResult.security_features?.microprinting_quality
                            ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/5 border-rose-500/30 text-rose-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {currencyResult.security_features?.microprinting_quality ? (
                              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                            ) : (
                              <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                            )}
                            <span className="font-medium">Halftone Moiré Analysis</span>
                          </div>
                          <span className="text-[10px] font-bold font-mono">
                            {currencyResult.security_features?.microprinting_quality ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Forensic Notes */}
                    {currencyResult.forensic_notes && currencyResult.forensic_notes.length > 0 && (
                      <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Forensic AI Diagnostics
                        </p>
                        <ul className="text-xs space-y-1.5 text-slate-300">
                          {currencyResult.forensic_notes.map((note, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-400 font-bold">•</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-panel p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[380px]">
                    <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
                      <Layers size={36} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-200">
                        Awaiting Banknote Specimen
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Upload a currency note photograph or choose one of the quick test presets to evaluate security features in real time.
                      </p>
                    </div>

                    {/* Security Check Highlights */}
                    <div className="w-full grid grid-cols-2 gap-2 text-left pt-4 border-t border-slate-800 text-xs text-slate-400">
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                        <p className="font-bold text-slate-300">Intaglio Relief</p>
                        <p className="text-[11px] text-slate-500">Laplacian edge variance detection</p>
                      </div>
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                        <p className="font-bold text-slate-300">2D FFT Moiré</p>
                        <p className="text-[11px] text-slate-500">Halftone dot-gain analysis</p>
                      </div>
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                        <p className="font-bold text-slate-300">Watermark Depth</p>
                        <p className="text-[11px] text-slate-500">Pulp luminance transmission</p>
                      </div>
                      <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80">
                        <p className="font-bold text-slate-300">Security Thread</p>
                        <p className="text-[11px] text-slate-500">Sobel vertical gradient continuity</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Banknote Scan Audit Trail Table (Stored in MongoDB Atlas) */}
            <div className="glass-panel overflow-hidden">
              <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="text-blue-500" size={20} />
                  <h3 className="font-bold text-lg">Banknote Forensic Audit Trail</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  Persisted to MongoDB Atlas ({currencyHistory.length} records)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-bold bg-slate-950/40">
                      <th className="p-4">Scan ID</th>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Specimen File</th>
                      <th className="p-4">Status / Verdict</th>
                      <th className="p-4">Confidence</th>
                      <th className="p-4">Risk Probability</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-800/50 font-medium">
                    {currencyHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500 text-xs">
                          No currency scans registered yet. Upload an image to begin auditing.
                        </td>
                      </tr>
                    ) : (
                      currencyHistory.map((scan, i) => (
                        <tr key={i} className="hover:bg-blue-500/[0.02] transition-colors">
                          <td className="p-4 font-mono text-xs text-slate-400">
                            {scan.scan_id || `SCAN-${i + 1}`}
                          </td>
                          <td className="p-4 text-xs text-slate-400">
                            {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : 'Just now'}
                          </td>
                          <td className="p-4 text-xs font-mono text-slate-300">
                            {scan.filename || 'banknote.jpg'}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase inline-flex items-center gap-1 ${
                              scan.is_fake
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {scan.is_fake ? <XCircle size={12} /> : <CheckCircle size={12} />}
                              {scan.prediction || (scan.is_fake ? 'COUNTERFEIT' : 'GENUINE')}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-200">
                            {((scan.confidence || 0) * 100).toFixed(1)}%
                          </td>
                          <td className="p-4 text-xs font-bold">
                            <span className={scan.is_fake ? 'text-rose-400' : 'text-emerald-400'}>
                              {((scan.risk_score || 0) * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6 text-white">
            {/* MongoDB Compass Connection Banner */}
            <div className="glass-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      MongoDB Database & Dataset Explorer
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Compass Live: mongodb://127.0.0.1:27017
                      </span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Database: <span className="font-mono text-slate-200">fraud_detection</span> • <span className="text-emerald-400 font-medium">Search-on-Demand</span> {dbSearch ? `("${dbSearch}" - ${dbTotalCount} result${dbTotalCount === 1 ? '' : 's'})` : '(Results show only after search)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (dbSearch.trim()) {
                      loadDbTransactions(dbFilterType, dbSearch);
                    }
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw size={13} className={isLoadingDb ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
            </div>

            {/* Controls Bar: Search & Filter Tabs */}
            <div className="glass-panel p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Type Filter Tabs */}
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
                {['ALL', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setDbFilterType(t);
                      if (dbSearch.trim().length > 0) loadDbTransactions(t, dbSearch);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg transition-all ${
                      dbFilterType === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'ALL' ? 'All Transactions' : t.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search Transaction ID, UPI, Card, Name..."
                    value={dbSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDbSearch(val);
                      if (val.trim()) {
                        loadDbTransactions(dbFilterType, val);
                      } else {
                        setDbTransactions([]);
                        setDbTotalCount(0);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && dbSearch.trim()) {
                        loadDbTransactions(dbFilterType, dbSearch);
                      }
                    }}
                    className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/50 text-white placeholder-slate-500"
                  />
                  {dbSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setDbSearch('');
                        setDbTransactions([]);
                        setDbTotalCount(0);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      title="Clear"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (dbSearch.trim()) {
                      loadDbTransactions(dbFilterType, dbSearch);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/30"
                >
                  <Search size={13} /> Search
                </button>
              </div>
            </div>

            {/* Table of Records */}
            <div className="glass-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-bold bg-slate-950/40">
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4">Channel / Type</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Counterparties / Holder</th>
                      <th className="p-4">Status / Risk</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-800/50 font-medium">
                    {dbTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500 text-xs">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Database size={32} className="text-slate-600 mb-1" />
                            <p className="font-semibold text-slate-300 text-sm">
                              {isLoadingDb
                                ? 'Searching MongoDB database...'
                                : dbSearch.trim()
                                ? `No transactions found matching "${dbSearch}"`
                                : 'No transactions displayed'}
                            </p>
                            <p className="text-slate-500 text-xs max-w-md">
                              {dbSearch.trim()
                                ? 'Double-check the transaction ID, UPI VPA, or Card details and try again.'
                                : 'Enter a Transaction ID (e.g. UPI-TXN-000001, CARD-TXN-000001), UPI address, or cardholder name above and click Search.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      dbTransactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-blue-500/[0.02] transition-colors">
                          <td className="p-4 font-mono text-xs text-slate-300">
                            <span className="font-semibold text-white">{tx.tx_id}</span>
                          </td>
                          <td className="p-4 text-xs">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
                              {tx.type || tx.card_type || 'UPI'}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-bold text-white">
                            ₹{(tx.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-4 text-xs text-slate-400">
                            {tx.sender_upi ? (
                              <div className="truncate max-w-[200px]">
                                <span className="text-slate-200">{tx.sender_upi}</span> → <span className="text-slate-400">{tx.receiver_upi}</span>
                              </div>
                            ) : tx.holder_name ? (
                              <div className="truncate max-w-[200px]">
                                <span className="text-slate-200 uppercase">{tx.holder_name}</span> ({tx.number ? '•••• ' + tx.number.slice(-4) : 'Card'})
                              </div>
                            ) : (
                              <span className="text-slate-500">{tx.user_id || 'N/A'}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase inline-flex items-center gap-1 ${
                              tx.analysis?.is_fraud
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {tx.analysis?.is_fraud ? <XCircle size={12} /> : <CheckCircle size={12} />}
                              {tx.analysis?.is_fraud ? 'FRAUD' : 'GENUINE'} ({((tx.analysis?.risk_score || 0) * 100).toFixed(0)}%)
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleLoadRecordIntoForensics(tx)}
                              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-white border border-blue-500/30 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1"
                              title="Auto-fill this transaction into Analytics form"
                            >
                              <Zap size={12} /> Auto-Fill in Analytics
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
