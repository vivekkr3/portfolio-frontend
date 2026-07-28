import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip as PieTooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip } from 'recharts';

const COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [portfolio, setPortfolio] = useState([]);
  const [history, setHistory] = useState([]); // NEW: State for historical data
  
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    
    try {
      const response = await axios.post(`https://my-portfolio-backend-hydd.onrender.com${endpoint}`, { username, password });
      
      if (isLoginMode) {
        localStorage.setItem('token', response.data.token);
        setToken(response.data.token);
      } else {
        setIsLoginMode(true);
        setAuthError('Registration successful! Please log in.');
      }
      setUsername(''); setPassword('');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setPortfolio([]);
    setHistory([]);
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchData = async () => {
    if (!token) return;
    try {
      // Fetch both portfolio and history data at the same time
      const [portfolioRes, historyRes] = await Promise.all([
        axios.get('https://my-portfolio-backend-hydd.onrender.com/api/portfolio', getAuthHeaders()),
        axios.get('https://my-portfolio-backend-hydd.onrender.com/api/history', getAuthHeaders())
      ]);
      
      setPortfolio(portfolioRes.data);
      
      // Format dates nicely for the chart
      const formattedHistory = historyRes.data.map(snap => ({
        ...snap,
        displayDate: new Date(snap.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      }));
      setHistory(formattedHistory);

    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) handleLogout();
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://my-portfolio-backend-hydd.onrender.com/api/portfolio', { name, ticker, shares }, getAuthHeaders());
      setName(''); setTicker(''); setShares('');
      fetchData(); 
    } catch (error) {
      console.error("Error adding asset", error);
    }
  };

  const handleDeleteAsset = async (id) => {
    try {
      await axios.delete(`https://my-portfolio-backend-hydd.onrender.com/api/portfolio/${id}`, getAuthHeaders());
      fetchData();
    } catch (error) {
      console.error("Error deleting asset", error);
    }
  };

  // NEW: Function to save a snapshot
  const handleSaveSnapshot = async () => {
    try {
      await axios.post('https://my-portfolio-backend-hydd.onrender.com/api/history', { totalValue }, getAuthHeaders());
      fetchData(); // Refresh to update the chart!
    } catch (error) {
      console.error("Error saving snapshot", error);
    }
  };

  const totalValue = portfolio.reduce((sum, asset) => sum + asset.value, 0);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-md">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-6 text-center">
            {isLoginMode ? 'Welcome Back' : 'Create Account'}
          </h2>
          {authError && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">{authError}</div>}
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" />
            <button type="submit" className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all active:scale-95">
              {isLoginMode ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          <p className="mt-6 text-center text-slate-400 text-sm">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-teal-400 hover:text-teal-300 font-semibold transition-colors">
              {isLoginMode ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-sans selection:bg-teal-500 selection:text-white">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-2">
              Portfolio Tracker
            </h1>
            <h2 className="text-2xl text-slate-400 font-light">
              Total Net Worth: <span className="text-white font-semibold">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </h2>
          </div>
          <div className="flex gap-4">
            <button onClick={handleSaveSnapshot} className="bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 px-6 py-2 rounded-lg border border-teal-500/50 transition-all font-medium">
              Save Snapshot
            </button>
            <button onClick={handleLogout} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-2 rounded-lg border border-slate-700 transition-all font-medium">
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-8">
            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700/50">
              <h3 className="text-xl font-bold mb-4 text-teal-400">Add New Investment</h3>
              <form onSubmit={handleAddAsset} className="space-y-4">
                <div><input type="text" placeholder="Asset Name (e.g., Reliance)" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                <div><input type="text" placeholder="Ticker Symbol (e.g., RELIANCE.NS)" value={ticker} onChange={(e) => setTicker(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                <div><input type="number" step="any" placeholder="Number of Shares (e.g., 10)" value={shares} onChange={(e) => setShares(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all" /></div>
                <button type="submit" className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-teal-500/25 transition-all active:scale-95">Buy Asset</button>
              </form>
            </div>

            <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700/50">
              <h3 className="text-xl font-bold mb-4 text-slate-300">Your Holdings</h3>
              {portfolio.length === 0 ? (
                <p className="text-slate-500 italic">No assets in portfolio.</p>
              ) : (
                <div className="space-y-3">
                  {portfolio.map((asset) => (
                    <div key={asset.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                      <div>
                        <strong className="text-lg text-white">{asset.name} <span className="text-sm font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full ml-1">{asset.ticker}</span></strong>
                        <div className="text-sm text-slate-400 mt-1">{asset.shares} shares @ {asset.originalCurrency} {asset.originalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 'N/A'}</div>
                        <div className="text-teal-400 font-semibold mt-1">Value: ₹{(asset.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <button onClick={() => handleDeleteAsset(asset.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition-all text-sm font-medium border border-red-500/20 hover:border-red-500">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col min-h-[500px]">
            <h3 className="text-xl font-bold mb-6 text-slate-300">Asset Allocation</h3>
            <div className="flex-grow flex items-center justify-center">
              {portfolio.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={portfolio} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={140} paddingAngle={5} stroke="none">
                      {portfolio.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <PieTooltip formatter={(value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc' }} itemStyle={{ color: '#f8fafc' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500 italic flex flex-col items-center">
                  Add assets to see your allocation
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NEW: Historical Trend Line Chart */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700/50 w-full min-h-[400px] flex flex-col">
          <h3 className="text-xl font-bold mb-6 text-slate-300">Net Worth Trend</h3>
          <div className="flex-grow">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="displayDate" stroke="#94a3b8" />
                  <YAxis 
                    stroke="#94a3b8" 
                    tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} 
                  />
                  <LineTooltip 
                    formatter={(value) => [`₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Net Worth']}
                    labelStyle={{ color: '#94a3b8' }}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 italic flex h-full items-center justify-center">
                Click "Save Snapshot" at the top to record your first data point!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}