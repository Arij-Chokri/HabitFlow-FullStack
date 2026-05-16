
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';

export default function CalendarPlanner({ 
  isDarkMode, 
  selectedDate, 
  setSelectedDate, 
  dateTasks, 
  newCalendarTaskText, 
  setNewCalendarTaskText, 
  addCalendarTaskDirect, 
  toggleCalendarTaskDirect, 
  deleteCalendarTaskDirect,
  formatDateString,
  todayStr
}) {

  // Generate an array of 14 days centered around today for our compact timeline view
  const generateCalendarDays = () => {
    const days = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 4); // Include 4 days of history buffer
    
    for (let i = 0; i < 14; i++) {
      days.push(new Date(baseDate));
      baseDate.setDate(baseDate.getDate() + 1);
    }
    return days;
  };

  return (
    <div className="space-y-6">
      
      {/* 📅 CALENDAR DAYS ROLLING TIMELINE ribbon */}
      <div className={`p-6 rounded-2xl shadow-sm border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <span className="text-xs bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold px-3 py-1 rounded-full">
            Selected Key: {selectedDate}
          </span>
        </div>
        
        {/* Crash-proof horizontal flex container */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {generateCalendarDays().map((dateItem, idx) => {
            const formattedKey = formatDateString(dateItem);
            const isSelected = formattedKey === selectedDate;
            const isToday = todayStr === formattedKey;
            const hasTasks = dateTasks[formattedKey] && dateTasks[formattedKey].length > 0;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDate(formattedKey)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl min-w-[62px] transition-all cursor-pointer border relative ${
                  isSelected 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 font-extrabold'
                      : isDarkMode 
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750' 
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {dateItem.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-base font-extrabold mt-1">
                  {dateItem.getDate()}
                </span>
                {hasTasks && (
                  <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 📝 DATE CONTENT LIST SCHEDULER */}
      <div className={`p-6 rounded-2xl shadow-sm border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60'}`}>
        <h3 className={`text-xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Tasks for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">These schedule points apply exclusively to this calendar date metric context.</p>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            addCalendarTaskDirect(selectedDate, newCalendarTaskText);
            setNewCalendarTaskText('');
          }} 
          className="flex gap-2 mb-6"
        >
          <input 
            type="text"
            required
            placeholder="Enter a specific schedule metric or action item..."
            value={newCalendarTaskText}
            onChange={(e) => setNewCalendarTaskText(e.target.value)}
            className={`flex-1 px-4 py-2.5 text-sm rounded-xl border bg-transparent focus:outline-none focus:border-indigo-500 transition-colors ${isDarkMode ? 'border-slate-700 text-white placeholder-slate-500' : 'border-slate-200 text-slate-800 placeholder-slate-400'}`}
          />
          <button type="submit" className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-colors cursor-pointer">
            <Plus size={16} /> Add Task
          </button>
        </form>

        <div className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
          {(dateTasks[selectedDate] || []).length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-slate-400 dark:text-slate-500">No scheduled timeline cards mapped for this coordinate yet.</p>
            </div>
          ) : (
            dateTasks[selectedDate].map(task => (
              <div key={task.id} className="flex items-center justify-between py-3.5 group">
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => toggleCalendarTaskDirect(selectedDate, task.id)}
                    className={`p-0.5 rounded transition-colors cursor-pointer ${task.completed ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}
                  >
                    {task.completed ? <CheckSquare size={22} className="fill-indigo-50 dark:fill-indigo-950/20" /> : <Square size={22} />}
                  </button>
                  <span className={`text-sm font-medium transition-all ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {task.text}
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => deleteCalendarTaskDirect(selectedDate, task.id)}
                  className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}