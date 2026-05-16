import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AnalyticsChart({ habits = [] }) {
  
  // 🧮 Function to dynamically generate the last 7 days of historical tracking data
  const generateWeeklyAnalyticsData = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dataPoints = [];

    // Loop through the trailing 7 days (matching the index layout of our habit.history array)
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      
      const dayLabel = daysOfWeek[targetDate.getDay()];
      
      // Calculate how many habits were successfully completed on this specific day index
      let completedCount = 0;
      habits.forEach(habit => {
        // Look at the matching history index slot (0 to 6)
        const historyIdx = 6 - i;
        if (habit.history && habit.history[historyIdx] === 1) {
          completedCount++;
        }
      });

      // Calculate percentage ratio (avoid division by zero if there are no habits yet)
      const completionRate = habits.length > 0 
        ? Math.round((completedCount / habits.length) * 100) 
        : 0;

      dataPoints.push({
        day: dayLabel,
        "Completion Rate": completionRate,
        "Completed Habits": completedCount
      });
    }

    return dataPoints;
  };

  const chartData = generateWeeklyAnalyticsData();

  return (
    <div className="w-full h-full min-h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/50" />
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fontWeight: 500 }}
            stroke="#94a3b8"
          />
          <YAxis 
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fontWeight: 500 }}
            stroke="#94a3b8"
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
            formatter={(value, name) => [name === 'Completion Rate' ? `${value}%` : value, name]}
          />
          <Area 
            type="monotone" 
            dataKey="Completion Rate" 
            stroke="#4f46e5" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#chartGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}