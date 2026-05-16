import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Flame, Calendar, Award, BarChart3, Plus, Home, X, Trash2, AlertTriangle, Sun, Moon, CalendarDays, ArrowLeft, Bell, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import AnalyticsChart from './AnalyticsChart';
import CalendarPlanner from './CalendarPlanner';

const API_URL = 'http://localhost:5000/api';

const formatDateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const todayStr = formatDateString(new Date());

  // --- Core Authentication States ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : { name: '', email: '' };
  });

  // --- Application Data Pools ---
  const [habits, setHabits] = useState([]);
  const [dateTasks, setDateTasks] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // --- Navigation & View Controls ---
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [newCalendarTaskText, setNewCalendarTaskText] = useState('');

  // --- Modal Visibility Toggles ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [habitToDelete, setHabitToDelete] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Helper config to automatically append JWT bearer security headers
  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // ==========================================
  // 📥 ASYNC DATABASE OPERATION CODES
  // ==========================================
  
  // 1. Fetch complete data payload from server database
  const fetchAllUserData = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      // Pull habits and flat tasks simultaneously using concurrent promise architecture
      const [habitsRes, tasksRes] = await Promise.all([
        axios.get(`${API_URL}/habits`, getAuthConfig()),
        axios.get(`${API_URL}/tasks`, getAuthConfig())
      ]);

      setHabits(habitsRes.data);

      // Reconstruct task list data array map down to state structural JSON index dictionary
      const structuredTasks = {};
      tasksRes.data.forEach(task => {
        if (!structuredTasks[task.date]) structuredTasks[task.date] = [];
        structuredTasks[task.date].push({
          id: task._id, // MongoDB ObjectIds
          text: task.text,
          completed: task.completed
        });
      });
      setDateTasks(structuredTasks);
    } catch (err) {
      console.error("Error retrieving dashboard database maps:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUserData();
  }, [isAuthenticated]);

  // ==========================================
  // 🔐 AUTH OPERATIONS
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/signup';
      const payload = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : authForm;

      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user_profile', JSON.stringify(res.data.user));
      
      setUserProfile(res.data.user);
      setIsAuthenticated(true);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Authentication lifecycle verification conflict.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_profile');
    setIsAuthenticated(false);
    setHabits([]);
    setDateTasks({});
    setCurrentView('dashboard');
  };

  // ==========================================
  // ⚙️ CALENDAR PLANNER ROUTINES
  // ==========================================
  const addCalendarTaskDirect = async (targetDate, text) => {
    if (!text.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/tasks`, { date: targetDate, text: text.trim() }, getAuthConfig());
      const newTask = { id: res.data._id, text: res.data.text, completed: res.data.completed };
      
      setDateTasks(prev => ({
        ...prev,
        [targetDate]: [...(prev[targetDate] || []), newTask]
      }));
    } catch (err) {
      console.error("Failed adding timeline task:", err);
    }
  };

  const toggleCalendarTaskDirect = async (targetDate, taskId) => {
    // Find item to calculate target logical state inversion
    const targetTask = dateTasks[targetDate]?.find(t => t.id === taskId);
    if (!targetTask) return;

    try {
      await axios.put(`${API_URL}/tasks/${taskId}`, { completed: !targetTask.completed }, getAuthConfig());
      setDateTasks(prev => ({
        ...prev,
        [targetDate]: (prev[targetDate] || []).map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        )
      }));
    } catch (err) {
      console.error("Failed adjusting completion flag status:", err);
    }
  };

  const deleteCalendarTaskDirect = async (targetDate, taskId) => {
    try {
      await axios.delete(`${API_URL}/tasks/${taskId}`, getAuthConfig());
      setDateTasks(prev => ({
        ...prev,
        [targetDate]: (prev[targetDate] || []).filter(task => task.id !== taskId)
      }));
    } catch (err) {
      console.error("Failed removing target data item element:", err);
    }
  };

  // ==========================================
  // ⚙️ HABITS ROUTINE SYNC
  // ==========================================
  const toggleHabitToday = async (id) => {
    const targetHabit = habits.find(h => h._id === id);
    if (!targetHabit) return;

    const newHistory = [...targetHabit.history];
    const todayIdx = newHistory.length - 1;
    const isCompleted = newHistory[todayIdx] === 1;
    
    newHistory[todayIdx] = isCompleted ? 0 : 1;
    const newStreak = isCompleted ? Math.max(0, targetHabit.streak - 1) : targetHabit.streak + 1;

    try {
      const res = await axios.put(`${API_URL}/habits/${id}`, { history: newHistory, streak: newStreak }, getAuthConfig());
      setHabits(prev => prev.map(h => h._id === id ? res.data : h));
    } catch (err) {
      console.error("Failed synchronizing state routine mutation adjustments:", err);
    }
  };

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/habits`, { name: newHabitName.trim() }, getAuthConfig());
      setHabits([...habits, res.data]);
      setNewHabitName('');
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed appending item routine database entry structural row:", err);
    }
  };

  const confirmDeleteHabit = async () => {
    if (!habitToDelete) return;
    try {
      await axios.delete(`${API_URL}/habits/${habitToDelete._id}`, getAuthConfig());
      setHabits(prev => prev.filter(h => h._id !== habitToDelete._id));
      setHabitToDelete(null);
    } catch (err) {
      console.error("Failed removing routine model mapping tracking instance:", err);
    }
  };

  // ==========================================
  // 📈 COMPYTATION INSIGHTS VISUALS
  // ==========================================
  const completedToday = habits.filter(habit => habit.history[habit.history.length - 1] === 1).length;
  const pendingTodayCalendarTasks = (dateTasks[todayStr] || []).filter(t => !t.completed);
  const hasPendingTasksToday = pendingTodayCalendarTasks.length > 0;

  const calculateWeeklyCompletion = () => {
    if (habits.length === 0) return 0;
    let totalSlots = 0, totalSuccess = 0;
    habits.forEach(habit => {
      totalSlots += habit.history.length;
      totalSuccess += habit.history.filter(day => day === 1).length;
    });
    return Math.round((totalSuccess / totalSlots) * 100);
  };

  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen font-sans flex items-center justify-center transition-colors duration-200 p-4 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <div className={`w-full max-w-md p-8 rounded-2xl shadow-xl border relative transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl mb-3">H</div>
            <h2 className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{authMode === 'login' ? 'Welcome to HabitFlow' : 'Create an account'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Connect your actions to centralized data systems loops.</p>
          </div>
          {authError && <div className="p-3.5 mb-4 text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-xl flex items-center gap-2"><AlertTriangle size={14}/> {authError}</div>}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" required placeholder="Alex Mercer" value={authForm.name} onChange={(e) => setAuthForm({...authForm, name: e.target.value})} className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:border-indigo-500 transition-colors ${isDarkMode ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-800'}`} /></div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="email" required placeholder="name@domain.com" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:border-indigo-500 transition-colors ${isDarkMode ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-800'}`} /></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="password" required placeholder="••••••••" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:border-indigo-500 transition-colors ${isDarkMode ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-800'}`} /></div>
            </div>
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-semibold shadow-md transition-all cursor-pointer text-sm">{authMode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={16} /></button>
          </form>
          <div className="mt-6 text-center border-t border-slate-100 dark:border-slate-800/60 pt-4"><button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">{authMode === 'login' ? "Don't have an account? Sign up free" : 'Already have an account? Log in instead'}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-200 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* SIDEBAR */}
      <aside className={`w-64 border-r p-6 flex flex-col justify-between hidden md:flex transition-colors shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">H</div><span className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>HabitFlow</span></div></div>
          <nav className="space-y-1">
            <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer ${currentView === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}><Home size={18} /> Dashboard</button>
            <button onClick={() => setCurrentView('calendar')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer relative ${currentView === 'calendar' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : hasPendingTasksToday && currentView === 'dashboard' ? 'bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 ring-2 ring-amber-400/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}><CalendarDays size={18} /><span>Calendar Planner</span>{hasPendingTasksToday && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}</button>
            <button onClick={() => setCurrentView('analytics')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer ${currentView === 'analytics' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}><BarChart3 size={18} /> Analytics</button>
          </nav>
        </div>
        <div className={`space-y-4 border-t pt-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}{isDarkMode ? 'Light Mode' : 'Dark Mode'}</button>
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}</div>
              <div className="overflow-hidden"><p className={`text-sm font-semibold truncate max-w-[105px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{userProfile.name || 'Profile User'}</p><p className="text-xs text-slate-400 dark:text-slate-500">Cloud Storage</p></div>
            </div>
            <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:underline cursor-pointer ml-1 shrink-0">Exit</button>
          </div>
        </div>
      </aside>

      {/* CORE CANVAS VIEW AREA */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto space-y-8 transition-colors w-full overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center z-40 transition-all">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {currentView === 'dashboard' && 'Welcome back!'}
              {currentView === 'calendar' && 'Calendar Task Planner'}
              {currentView === 'analytics' && 'Analytics Insights'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              {currentView === 'dashboard' && 'Here are your cloud sync loop layouts.'}
              {currentView === 'calendar' && 'Plan out structural responsibilities bound to distinct timelines.'}
              {currentView === 'analytics' && 'A deeper breakdown of your performance loops.'}
            </p>
          </div>
          {currentView === 'dashboard' && (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all cursor-pointer"><Plus size={18} /> Add Habit</button>
          )}
        </div>

        {currentView === 'dashboard' && hasPendingTasksToday && (
          <div className="p-4 rounded-2xl border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 rounded-xl text-white shadow-sm"><Bell size={18} className="animate-bounce" /></div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">You have {pendingTodayCalendarTasks.length} pending calendar tasks scheduled for today!</h4>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">Next item: "{pendingTodayCalendarTasks[0].text}"</p>
              </div>
            </div>
            <button onClick={() => setCurrentView('calendar')} className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap">Go to Planner</button>
          </div>
        )}

        {currentView === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard icon={<Flame className="text-orange-500" />} title="Best Streak" value={`${bestStreak} Days`} change="Live calculation" isDarkMode={isDarkMode} />
              <StatCard icon={<Calendar className="text-blue-500" />} title="Weekly Completion" value={`${calculateWeeklyCompletion()}%`} change="Aggregated total score" isDarkMode={isDarkMode} />
              <StatCard icon={<CheckCircle className="text-green-500" />} title="Completed Today" value={`${completedToday}/${habits.length}`} change="Real-time target pacing" isDarkMode={isDarkMode} />
              <StatCard icon={<Award className="text-purple-500" />} title="Productivity Score" value={calculateWeeklyCompletion() > 75 ? "A+" : "B"} change="Based on performance" isDarkMode={isDarkMode} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`lg:col-span-2 p-6 rounded-2xl shadow-sm border space-y-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60'}`}>
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Today's Habits</h2>
                <div className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {habits.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">No routine tracks recorded inside this account profiles. Build one now!</p>
                  ) : habits.map(habit => (
                    <HabitRow key={habit._id} habit={habit} isDarkMode={isDarkMode} onToggle={() => toggleHabitToday(habit._id)} onDelete={() => setHabitToDelete(habit)} />
                  ))}
                </div>
              </div>
              <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60'}`}>
                <div>
                  <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Weekly Activity</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Consistency ratio over recent metrics.</p>
                  <div className="h-48 mt-2"><AnalyticsChart habits={habits} /></div>
                </div>
                <button onClick={() => setCurrentView('analytics')} className={`mt-6 w-full text-center text-sm font-semibold py-2.5 rounded-xl transition-colors cursor-pointer ${isDarkMode ? 'text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/40' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}>View Detailed Analytics</button>
              </div>
            </div>
          </>
        )}

        {currentView === 'calendar' && (
          <CalendarPlanner isDarkMode={isDarkMode} selectedDate={selectedDate} setSelectedDate={setSelectedDate} dateTasks={dateTasks} newCalendarTaskText={newCalendarTaskText} setNewCalendarTaskText={setNewCalendarTaskText} addCalendarTaskDirect={addCalendarTaskDirect} toggleCalendarTaskDirect={toggleCalendarTaskDirect} deleteCalendarTaskDirect={deleteCalendarTaskDirect} formatDateString={formatDateString} todayStr={todayStr} />
        )}

        {currentView === 'analytics' && (
          <div className={`p-8 rounded-2xl shadow-sm border space-y-6 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60'}`}>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Historical Completion Metrics</h2>
            
<div className="h-96 w-full"><AnalyticsChart habits={habits} /></div>
          </div>
        )}
      </main>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-xl border p-6 relative ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={18} /></button>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Create a New Habit</h3>
            <form onSubmit={handleAddHabit} className="space-y-4">
              <div><input type="text" required placeholder="e.g., Read 30 mins, Meditate" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} className={`w-full px-4 py-2.5 rounded-xl border bg-transparent text-sm focus:outline-none focus:border-indigo-500 ${isDarkMode ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-800'}`} /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 font-semibold text-sm px-4 py-2">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm">Create Habit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETION CONFIRMATION MODAL */}
      {habitToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl border p-6 text-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} /></div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Delete Habit?</h3>
            <p className="text-sm text-slate-500 mt-1">Remove "{habitToDelete.name}" permanently from the database?</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setHabitToDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-500">Cancel</button>
              <button onClick={confirmDeleteHabit} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, change, isDarkMode }) {
  return (
    <div className={`p-5 rounded-2xl border shadow-sm flex items-start gap-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-200/60'}`}>
      <div className={`p-3 border rounded-xl ${isDarkMode ? 'bg-slate-850 border-slate-700/40' : 'bg-slate-50 border-slate-100'}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">{title}</p>
        <h3 className={`text-2xl font-bold mt-0.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{value}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{change}</p>
      </div>
    </div>
  );
}

function HabitRow({ habit, onToggle, onDelete, isDarkMode }) {
  const isCompletedToday = habit.history[habit.history.length - 1] === 1;

  const getTrailingDaysLabels = () => {
    const labels = [];
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(weekdays[d.getDay()]);
    }
    return labels;
  };

  const dayLabels = getTrailingDaysLabels();

  return (
    <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0 group">
      <div className="flex items-center gap-4">
        <button onClick={onToggle} className={`p-1 rounded-full transition-colors cursor-pointer ${isCompletedToday ? 'text-green-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}>
          {isCompletedToday ? <CheckCircle size={26} className={isDarkMode ? 'fill-green-950/20' : 'fill-green-50/50'} /> : <Circle size={26} />}
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h4 className={`font-semibold ${isCompletedToday ? 'line-through text-slate-400 dark:text-slate-500' : isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{habit.name}</h4>
            <button onClick={onDelete} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"><Trash2 size={14} /></button>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-orange-600 font-medium"><Flame size={12} className="fill-orange-500" /><span>{habit.streak} day streak</span></div>
        </div>
      </div>
      <div className="flex gap-1.5 hidden sm:flex">
        {habit.history.map((day, idx) => (
          <div key={idx} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${day === 1 ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 border-green-200' : isDarkMode ? 'bg-slate-800 text-slate-500 border-transparent' : 'bg-slate-50 text-slate-400'}`}>{dayLabels[idx]}</div>
        ))}
      </div>
    </div>
  );
}