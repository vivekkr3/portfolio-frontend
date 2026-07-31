import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip as PieTooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip } from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import { Wallet, TrendingUp, PieChart as PieChartIcon, LogIn, UserPlus, Lock, User, PlusCircle, Trash2, LogOut, Save, LayoutDashboard } from 'lucide-react';

const COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [portfolio, setPortfolio] = useState([]);
  const [history, setHistory] = useState([]); 
  
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);

  // Using the Render production URL. Ensure there are no brackets here!
  const API_URL = 'https://my-portfolio-backend-hydd.onrender.com';

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const toastId = toast.loading(isLoginMode ? 'Authenticating...' : 'Creating account...');
    
    try {
      const response = await axios.post(`${API_URL}${endpoint}`, { username, password });
      
      if (isLoginMode) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
        toast.success('Welcome back!', { id: toastId });
      } else {
        setIsLoginMode(true);
        toast.success('Account created! Please log in.', { id: toastId });
      }
      setUsername(''); setPassword('');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Authentication failed');
      toast.error('Authentication failed', { id: toastId });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setPortfolio([]);
    setHistory([]);
    toast('Securely logged out', { icon: '🔒' });
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true); 
    try {
      const [portfolioRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/api/portfolio`, getAuthHeaders()),
        axios.get(`${API_URL}/api/history`, getAuthHeaders())
      ]);
      
      // Fallback in case the backend sends an HTML error page or empty response
      const rawAssets = Array.isArray(portfolioRes.data) ? portfolioRes.data : [];
      const rawHistory = Array.isArray(historyRes.data) ? historyRes.data : [];

      // 1. Fetch USD to INR using a public CORS proxy
      let usdToInrRate = 83.50;
      try {
        const fxUrl = encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/USDINR=X');
        const fxRes = await axios.get(`https://api.allorigins.win/raw?url=${fxUrl}`);
        if (fxRes.data?.chart?.result?.[0]?.meta?.regularMarketPrice) {
          usdToInrRate = fxRes.data.chart.result[0].meta.regularMarketPrice;
        }
      } catch (e) {
        console.warn("FX fetch failed, using fallback 83.50");
      }

      // 2. Fetch prices SEQUENTIALLY to prevent rate-limiting the proxy
      const populatedAssets = [];
      
      for (const asset of rawAssets) {
        try {
          const assetUrl = encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${asset.ticker}`);
          const res = await axios.get(`https://api.allorigins.win/raw?url=${assetUrl}`);
          
          const meta = res.data.chart.result[0].meta;
          const livePrice = meta.regularMarketPrice;
          const currency = meta.currency || 'INR';
          
          let priceInINR = currency === 'USD' ? livePrice * usdToInrRate : livePrice;
          
          // NEW: Convert the buy price to INR if the stock trades in USD!
          let buyPriceInINR = currency === 'USD' ? (asset.buyPrice || 0) * usdToInrRate : (asset.buyPrice || 0);
          
          const currentValue = priceInINR * asset.shares;
          const totalInvested = buyPriceInINR * asset.shares;
          const pnl = currentValue - totalInvested;
          const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

          populatedAssets.push({
            ...asset,
            originalCurrency: currency,
            originalPrice: livePrice,
            value: currentValue,
            totalInvested,      
            pnl,                
            pnlPercent          
          });
        } catch (err) {
          console.error(`Browser block on ${asset.ticker}. Using mock data.`);
          const mockPriceINR = 2500 + (Math.random() * 500); 
          const currentValue = mockPriceINR * asset.shares;
          const totalInvested = (asset.buyPrice || 0) * asset.shares;
          const pnl = currentValue - totalInvested;
          const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

          populatedAssets.push({ 
            ...asset, 
            originalCurrency: 'INR (Mocked)', 
            originalPrice: mockPriceINR, 
            value: currentValue,
            totalInvested,
            pnl,
            pnlPercent
          });
        }
        
        // Polite delay of 500ms before fetching the next ticker
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setPortfolio(populatedAssets);
      
      const formattedHistory = rawHistory.map(snap => ({
        ...snap,
        displayDate: new Date(snap.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      }));
      setHistory(formattedHistory);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) handleLogout();
      toast.error('Failed to sync market data');
    } finally {
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddAsset = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Executing trade...');
    try {
      await axios.post(`${API_URL}/api/portfolio`, { name, ticker, shares, buyPrice }, getAuthHeaders());
      setName(''); setTicker(''); setShares(''); setBuyPrice('');
      await fetchData(); 
      toast.success(`${name} added to portfolio!`, { id: toastId });
    } catch (error) {
      toast.error('Failed to add asset', { id: toastId });
    }
  };

  const handleDeleteAsset = async (id, assetName) => {
    const toastId = toast.loading('Liquidating asset...');
    try {
      await axios.delete(`${API_URL}/api/portfolio/${id}`, getAuthHeaders());
      await fetchData();
      toast.success(`${assetName} sold successfully`, { id: toastId });
    } catch (error) {
      toast.error('Failed to delete asset', { id: toastId });
    }
  };

  const handleSaveSnapshot = async () => {
    const toastId = toast.loading('Recording net worth...');
    try {
      await axios.post(`${API_URL}/api/history`, { totalValue }, getAuthHeaders());
      await fetchData(); 
      toast.success('Snapshot locked in!', { id: toastId });
    } catch (error) {
      toast.error('Failed to save snapshot', { id: toastId });
    }
  };

  const totalValue = portfolio.reduce((sum, asset) => sum + (asset.value || 0), 0);

  // --- UI RENDERING ---

  if (!token) {
    return (
      <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans overflow-hidden">
        <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
        
        {/* Ambient Background Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-teal-500/10 blur-[120px]"></div>
          <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[100px]"></div>
        </div>

        {/* Glassmorphism Login Card */}
        <div className="relative z-10 bg-slate-900/60 backdrop-blur-2xl p-10 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-700/50 w-full max-w-md transition-all">
          
          <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20">
            <Wallet className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-3xl font-extrabold text-white mb-2 text-center tracking-tight">
            {isLoginMode ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-slate-400 text-center mb-8 text-sm">
            {isLoginMode ? 'Enter your details to access your portfolio.' : 'Start tracking your net worth today.'}
          </p>

          {authError && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm text-center flex items-center justify-center gap-2"><Lock className="w-4 h-4"/> {authError}</div>}
          
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required 
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all" />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-teal-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              {isLoginMode ? <><LogIn className="w-5 h-5"/> Sign In</> : <><UserPlus className="w-5 h-5"/> Sign Up</>}
            </button>
          </form>
          
          <p className="mt-8 text-center text-slate-400 text-sm">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-teal-400 hover:text-teal-300 font-semibold transition-colors underline-offset-4 hover:underline">
              {isLoginMode ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-t-2 border-teal-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-blue-500 animate-spin flex items-center justify-center">
            <Wallet className="w-6 h-6 text-teal-400" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-slate-300 animate-pulse tracking-wide">Syncing Market Data...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-teal-500/30 selection:text-teal-200">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Navbar / Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-1">Live Dashboard</h1>
              <h2 className="text-3xl md:text-4xl font-light text-slate-400">
                Net Worth: <span className="text-white font-bold tracking-tight">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </h2>
            </div>
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <button onClick={handleSaveSnapshot} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 px-5 py-2.5 rounded-xl border border-teal-500/30 transition-all font-medium">
              <Save className="w-4 h-4" /> Snapshot
            </button>
            <button onClick={handleLogout} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-xl border border-slate-700 transition-all font-medium">
              <LogOut className="w-4 h-4" /> Exit
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (Forms & List) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-slate-900/50 p-7 rounded-3xl border border-slate-800 hover:border-slate-700 transition-colors backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><PlusCircle className="w-5 h-5"/></div>
                <h3 className="text-xl font-semibold text-white">Acquire Asset</h3>
              </div>
              <form onSubmit={handleAddAsset} className="space-y-4">
                <input type="text" placeholder="Asset Name (e.g., Reliance)" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all" />
                <input type="text" placeholder="Ticker (RELIANCE.NS)" value={ticker} onChange={(e) => setTicker(e.target.value)} required className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all uppercase" />
                <div className="flex gap-4">
                  <input type="number" step="any" placeholder="Qty" value={shares} onChange={(e) => setShares(e.target.value)} required className="w-1/2 bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all" />
                  <input type="number" step="any" placeholder="Avg Buy (Native Currency)" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} required className="w-1/2 bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all" />
                </div>
                <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-all active:scale-[0.98] mt-2">
                  Execute Trade
                </button>
              </form>
            </div>

            <div className="bg-slate-900/50 p-7 rounded-3xl border border-slate-800 hover:border-slate-700 transition-colors backdrop-blur-xl shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400"><Wallet className="w-5 h-5"/></div>
                <h3 className="text-xl font-semibold text-white">Current Holdings</h3>
              </div>
              
              {portfolio.length === 0 ? (
                <div className="text-center py-10 text-slate-500 border border-dashed border-slate-700 rounded-2xl">
                  No open positions.
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {portfolio.map((asset) => (
                    <div key={asset.id} className="group flex justify-between items-center bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 hover:border-teal-500/30 hover:bg-slate-800/50 transition-all duration-300">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-lg font-semibold text-white">{asset.name}</strong>
                          <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-md">{asset.ticker}</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">{asset.shares} shares @ {asset.originalCurrency} {asset.originalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}</div>
                      </div>
                      
                      <div className="text-right flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-teal-400 font-bold text-lg">₹{(asset.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          {(asset.buyPrice || 0) > 0 && (
                            <div className={`text-xs font-semibold px-2 py-1 rounded-md mt-1 inline-block border ${asset.pnl >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                              {asset.pnl >= 0 ? '+' : ''}₹{asset.pnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({asset.pnl >= 0 ? '+' : ''}{asset.pnlPercent.toFixed(2)}%)
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleDeleteAsset(asset.id, asset.name)} className="opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-all border border-red-500/20 hover:border-red-500" title="Sell Asset">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Charts) */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="bg-slate-900/50 p-7 rounded-3xl border border-slate-800 hover:border-slate-700 transition-colors backdrop-blur-xl shadow-xl flex flex-col h-[400px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><PieChartIcon className="w-5 h-5"/></div>
                <h3 className="text-xl font-semibold text-white">Asset Allocation</h3>
              </div>
              <div className="flex-grow flex items-center justify-center">
                {portfolio.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={portfolio} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={130} paddingAngle={5} stroke="none">
                        {portfolio.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <PieTooltip formatter={(value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-500 text-sm flex flex-col items-center justify-center h-full w-full border border-dashed border-slate-700 rounded-2xl">
                    <PieChartIcon className="w-8 h-8 mb-2 opacity-50"/>
                    Awaiting data
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 p-7 rounded-3xl border border-slate-800 hover:border-slate-700 transition-colors backdrop-blur-xl shadow-xl flex flex-col flex-grow min-h-[400px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><TrendingUp className="w-5 h-5"/></div>
                <h3 className="text-xl font-semibold text-white">Performance History</h3>
              </div>
              <div className="flex-grow">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="displayDate" stroke="#64748b" tick={{fontSize: 12}} tickLine={false} axisLine={false} dy={10} />
                      <YAxis stroke="#64748b" tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} tick={{fontSize: 12}} tickLine={false} axisLine={false} dx={-10} />
                      <LineTooltip formatter={(value) => [`₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Net Worth']} labelStyle={{ color: '#94a3b8', marginBottom: '4px' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} />
                      <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={4} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 8, fill: '#14b8a6', stroke: '#fff', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-500 text-sm flex flex-col items-center justify-center h-full w-full border border-dashed border-slate-700 rounded-2xl">
                    <TrendingUp className="w-8 h-8 mb-2 opacity-50"/>
                    Click "Snapshot" to begin tracking
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Custom Scrollbar styling injected globally for the list */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}