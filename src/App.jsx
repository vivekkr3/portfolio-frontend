import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip as PieTooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip } from 'recharts';
import toast, { Toaster } from 'react-hot-toast';
import { Wallet, TrendingUp, PieChart as PieChartIcon, LogIn, UserPlus, Lock, User, PlusCircle, Trash2, LogOut, Save, LayoutDashboard, ShieldCheck, BarChart3, Quote } from 'lucide-react';

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

  // Set this to your live Render URL when deploying!
  //const API_URL = 'http://localhost:5005';
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
    try {
      const [portfolioRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/api/portfolio`, getAuthHeaders()),
        axios.get(`${API_URL}/api/history`, getAuthHeaders())
      ]);
      
      const rawAssets = Array.isArray(portfolioRes.data) ? portfolioRes.data : [];
      const rawHistory = Array.isArray(historyRes.data) ? historyRes.data : [];

      const formattedHistory = rawHistory.map(snap => ({
        ...snap,
        displayDate: new Date(snap.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      }));
      
      setHistory(formattedHistory);
      setPortfolio(rawAssets);
      
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

  if (!token) {
    return (
      <div className="relative min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 font-sans overflow-hidden">
        <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
        
        {/* Ambient Background Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-teal-500/10 blur-[120px]"></div>
          <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[100px]"></div>
        </div>

        {/* Wide Split-Screen Glass Card */}
        <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700/50 overflow-hidden">
          
          {/* Left Side: The Banner */}
          <div className="w-full md:w-5/12 bg-gradient-to-br from-slate-800 to-slate-900 p-8 md:p-12 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-slate-700/50 overflow-hidden">
            {/* Banner Background Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/20 rounded-full blur-[80px]"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-teal-500/20">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                Command your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">financial empire.</span>
              </h1>
              
              <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-10">
                Join elite investors tracking their global assets, analyzing real-time market trends, and building generational wealth.
              </p>

              <div className="space-y-5 hidden md:block">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl"><BarChart3 className="text-teal-400 w-5 h-5"/></div>
                  <span className="text-slate-200 text-sm font-medium tracking-wide">Live P&L Analytics</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl"><TrendingUp className="text-blue-400 w-5 h-5"/></div>
                  <span className="text-slate-200 text-sm font-medium tracking-wide">Historical Net Worth</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl"><ShieldCheck className="text-purple-400 w-5 h-5"/></div>
                  <span className="text-slate-200 text-sm font-medium tracking-wide">Bank-Grade Encryption</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10 md:mt-0 pt-8 border-t border-slate-700/50">
              <Quote className="w-6 h-6 text-slate-500 mb-3 opacity-50" />
              <p className="text-xs md:text-sm text-slate-400 italic font-light">
                "The best time to plant a tree was 20 years ago. The second best time is today."
              </p>
            </div>
          </div>

          {/* Right Side: The Form */}
          <div className="w-full md:w-7/12 p-8 md:p-14 flex flex-col justify-center bg-slate-950/40 relative">
            
            <div className="max-w-md w-full mx-auto">
              <div className="mb-10 text-center md:text-left">
                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                  {isLoginMode ? 'Welcome back' : 'Create an account'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isLoginMode ? 'Enter your credentials to access your dashboard.' : 'Start your journey to financial freedom today.'}
                </p>
              </div>

              {authError && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3.5 rounded-xl mb-6 text-sm flex items-center gap-3"><ShieldCheck className="w-5 h-5"/> {authError}</div>}
              
              <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-4">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required 
                      className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all" />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                      className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-teal-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4">
                  {isLoginMode ? <><LogIn className="w-5 h-5"/> Sign In</> : <><UserPlus className="w-5 h-5"/> Create Account</>}
                </button>
              </form>
              
              <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                <p className="text-slate-400 text-sm">
                  {isLoginMode ? "New to the platform? " : "Already have an account? "}
                  <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-teal-400 hover:text-teal-300 font-semibold transition-colors underline-offset-4 hover:underline">
                    {isLoginMode ? 'Sign up here' : 'Log in here'}
                  </button>
                </p>
              </div>
            </div>
            
          </div>
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
        <h2 className="text-xl font-semibold text-slate-300 animate-pulse tracking-wide">Initializing Dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans selection:bg-teal-500/30 selection:text-teal-200">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-1">Live Dashboard</h1>
              
              <h2 className="text-3xl md:text-4xl font-light text-slate-400 flex items-center gap-3">
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
          
          {}
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
                          {/* CRASH-PROOF PNL BADGE (Guaranteed fallback to 0) */}
                          {(asset.buyPrice || 0) > 0 && asset.pnl !== undefined && (
                            <div className={`text-xs font-semibold px-2 py-1 rounded-md mt-1 inline-block border ${asset.pnl >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                              {asset.pnl >= 0 ? '+' : ''}₹{(asset.pnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({asset.pnl >= 0 ? '+' : ''}{(asset.pnlPercent || 0).toFixed(2)}%)
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
      
      {}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}