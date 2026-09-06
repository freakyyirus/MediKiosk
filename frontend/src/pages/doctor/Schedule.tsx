import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, ChevronLeft, ChevronRight, Users, Clock, Sun, Moon,
  Stethoscope, User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Sidebar, Header, Card, LoadingSpinner, Badge } from '../../components/shared';

interface DoctorProfile {
  id: string;
  name: string;
  specialization: string | null;
}

interface OpdSlot {
  id: string;
  doctor_id: string;
  date: string;
  slot_type: 'morning' | 'evening';
  start_time: string;
  end_time: string;
  max_capacity: number;
  patients_booked: number;
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNum: number;
  month: string;
  isToday: boolean;
  isPast: boolean;
  morning: OpdSlot | null;
  evening: OpdSlot | null;
}

const sidebarItems = [
  { label: 'Dashboard', path: '/doctor/dashboard' },
  { label: 'My Patients', path: '/doctor/queue' },
  { label: 'Schedule', path: '/doctor/schedule' },
  { label: 'Profile', path: '/doctor/profile' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Schedule() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day + 1); // Monday
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [slots, setSlots] = useState<OpdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchSlots = useCallback(async (doctorId: string, start: Date, end: Date) => {
    const { data } = await supabase
      .from('opd_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('date', start.toISOString().split('T')[0])
      .lte('date', end.toISOString().split('T')[0]);

    setSlots((data as OpdSlot[]) || []);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!user?.id) return;
        const { data: doc } = await supabase
          .from('doctors')
          .select('id, name, specialization')
          .eq('user_id', user.id)
          .single();

        if (doc) {
          setDoctor(doc as DoctorProfile);

          const end = new Date(weekStart);
          end.setDate(end.getDate() + 6);
          await fetchSlots(doc.id, weekStart, end);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, weekStart, fetchSlots]);

  const navigateWeek = (direction: number) => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + direction * 7);
    setWeekStart(newStart);
    setSelectedDay(null);
  };

  const goToThisWeek = () => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
    setSelectedDay(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const userForSidebar = doctor
    ? { name: doctor.name, role: doctor.specialization || 'Doctor' }
    : undefined;

  // Build week days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDays: DaySchedule[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const daySlots = slots.filter((s) => s.date === dateStr);
    const morning = daySlots.find((s) => s.slot_type === 'morning') || null;
    const evening = daySlots.find((s) => s.slot_type === 'evening') || null;

    return {
      date: dateStr,
      dayName: DAY_NAMES[d.getDay()],
      dayNum: d.getDate(),
      month: MONTH_NAMES[d.getMonth()],
      isToday: d.getTime() === today.getTime(),
      isPast: d.getTime() < today.getTime(),
      morning,
      evening,
    };
  });

  const selectedDayData = weekDays.find((d) => d.date === selectedDay);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        items={sidebarItems.map((item) => ({
          ...item,
          icon: item.label === 'Dashboard' ? <Stethoscope size={20} /> :
            item.label === 'My Patients' ? <Users size={20} /> :
            item.label === 'Schedule' ? <Calendar size={20} /> :
            <User size={20} />,
        }))}
        currentPath="/doctor/schedule"
        onNavigate={navigate}
        onLogout={handleLogout}
        user={userForSidebar}
      />

      <div className="lg:ml-64">
        <Header
          title="Schedule"
          subtitle="Weekly OPD schedule overview"
          user={userForSidebar}
        />

        <div className="p-4 sm:p-6 space-y-6">
          {/* Week navigation */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-semibold text-surface-900">
                {weekDays[0]?.month} {weekDays[0]?.dayNum} — {weekDays[6]?.month} {weekDays[6]?.dayNum}, {weekStart.getFullYear()}
              </h2>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              onClick={goToThisWeek}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
            >
              Today
            </button>
          </motion.div>

          {/* Calendar grid */}
          <motion.div
            className="grid grid-cols-7 gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {weekDays.map((day) => {
              const isSelected = selectedDay === day.date;
              const morningPct = day.morning ? Math.round((day.morning.patients_booked / Math.max(day.morning.max_capacity, 1)) * 100) : 0;
              const eveningPct = day.evening ? Math.round((day.evening.patients_booked / Math.max(day.evening.max_capacity, 1)) * 100) : 0;

              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(isSelected ? null : day.date)}
                  className={`relative p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200 shadow-md'
                      : day.isToday
                      ? 'border-primary-300 bg-primary-50/50'
                      : day.isPast
                      ? 'border-surface-200 bg-surface-50 opacity-60'
                      : 'border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm'
                  }`}
                >
                  {day.isToday && (
                    <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500" />
                  )}
                  <p className={`text-xs font-medium ${day.isToday ? 'text-primary-600' : 'text-surface-500'}`}>
                    {day.dayName}
                  </p>
                  <p className={`text-xl font-bold mt-0.5 ${day.isToday ? 'text-primary-700' : 'text-surface-900'}`}>
                    {day.dayNum}
                  </p>
                  <p className="text-[10px] text-surface-400 mb-2">{day.month}</p>

                  {/* Slot indicators */}
                  <div className="space-y-1.5">
                    {day.morning && (
                      <div className="flex items-center gap-1.5">
                        <Sun size={10} className="text-amber-500 shrink-0" />
                        <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              morningPct >= 80 ? 'bg-danger-500' : morningPct >= 50 ? 'bg-warning-500' : 'bg-success-500'
                            }`}
                            style={{ width: `${morningPct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-surface-500 font-medium">
                          {day.morning.patients_booked}/{day.morning.max_capacity}
                        </span>
                      </div>
                    )}
                    {day.evening && (
                      <div className="flex items-center gap-1.5">
                        <Moon size={10} className="text-indigo-400 shrink-0" />
                        <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              eveningPct >= 80 ? 'bg-danger-500' : eveningPct >= 50 ? 'bg-warning-500' : 'bg-success-500'
                            }`}
                            style={{ width: `${eveningPct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-surface-500 font-medium">
                          {day.evening.patients_booked}/{day.evening.max_capacity}
                        </span>
                      </div>
                    )}
                    {!day.morning && !day.evening && (
                      <p className="text-[10px] text-surface-400 italic">No slots</p>
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>

          {/* Selected day detail */}
          {selectedDayData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <h3 className="text-lg font-semibold text-surface-900 mb-4">
                  {selectedDayData.dayName}, {selectedDayData.month} {selectedDayData.dayNum}
                  {selectedDayData.isToday && (
                    <Badge variant="info" size="sm">Today</Badge>
                  )}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Morning slot */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Sun size={18} className="text-amber-600" />
                      <h4 className="font-semibold text-amber-900">Morning OPD</h4>
                    </div>
                    {selectedDayData.morning ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-amber-700">Time</span>
                          <span className="font-medium text-amber-900">
                            {selectedDayData.morning.start_time || '9:00 AM'} — {selectedDayData.morning.end_time || '1:00 PM'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-amber-700">Patients</span>
                          <span className="font-medium text-amber-900">
                            {selectedDayData.morning.patients_booked} / {selectedDayData.morning.max_capacity}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{
                              width: `${Math.round(
                                (selectedDayData.morning.patients_booked / Math.max(selectedDayData.morning.max_capacity, 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-600 italic">No morning slot scheduled</p>
                    )}
                  </div>

                  {/* Evening slot */}
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Moon size={18} className="text-indigo-500" />
                      <h4 className="font-semibold text-indigo-900">Evening OPD</h4>
                    </div>
                    {selectedDayData.evening ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-indigo-700">Time</span>
                          <span className="font-medium text-indigo-900">
                            {selectedDayData.evening.start_time || '4:00 PM'} — {selectedDayData.evening.end_time || '7:00 PM'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-indigo-700">Patients</span>
                          <span className="font-medium text-indigo-900">
                            {selectedDayData.evening.patients_booked} / {selectedDayData.evening.max_capacity}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width: `${Math.round(
                                (selectedDayData.evening.patients_booked / Math.max(selectedDayData.evening.max_capacity, 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-indigo-600 italic">No evening slot scheduled</p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Legend */}
          <motion.div
            className="flex items-center gap-4 text-xs text-surface-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-success-500" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-warning-500" /> Filling up
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger-500" /> Nearly full
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-500" /> Today
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
