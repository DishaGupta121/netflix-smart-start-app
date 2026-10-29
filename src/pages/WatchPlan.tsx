import { ArrowLeft, Calendar, Clock, CheckCircle2, Circle, Save, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getShowById } from '../data/shows';
import type { PlanEpisode, WatchPlan as WatchPlanType } from '../types';
import { supabase } from '../lib/supabase';

interface WatchPlanProps {
  showId: string;
  onBack: () => void;
}

const SESSION_OPTIONS = [
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1.5 hours' },
  { minutes: 120, label: '2 hours' },
  { minutes: 180, label: '3 hours' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function WatchPlan({ showId, onBack }: WatchPlanProps) {
  const show = getShowById(showId);
  const [sessionMinutes, setSessionMinutes] = useState(90);
  const [sessionDays, setSessionDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [plan, setPlan] = useState<PlanEpisode[]>([]);
  const [savedPlan, setSavedPlan] = useState<WatchPlanType | null>(null);
  const [saving, setSaving] = useState(false);
  const [completedEps, setCompletedEps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!show) return;

    supabase
      .from('watch_plans')
      .select('*')
      .eq('show_id', showId)
      .eq('active', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSavedPlan(data as WatchPlanType);
      });
  }, [showId, show]);

  useEffect(() => {
    if (!show) return;
    generatePlan();
  }, [sessionMinutes, sessionDays, show]);

  const generatePlan = () => {
    if (!show) return;
    const episodes: PlanEpisode[] = [];
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    let dayIndex = 0;
    let epNum = 1;
    let season = 1;
    const epsPerSeason = Math.ceil(show.totalEpisodes / show.seasons);
    const epsPerSession = Math.floor(sessionMinutes / show.avgEpisodeMinutes);
    if (epsPerSession === 0) {
      episodes.push({
        season,
        episode: epNum,
        title: `S${season}E${epNum}`,
        durationMinutes: show.avgEpisodeMinutes,
        watchDate: formatDate(today),
      });
      setPlan(episodes);
      return;
    }

    let scheduledDays = 0;
    while (epNum <= show.totalEpisodes && scheduledDays < 30) {
      const currentDay = addDays(today, dayIndex);
      const dayOfWeek = currentDay.getDay() === 0 ? 6 : currentDay.getDay() - 1;
      if (sessionDays.includes(dayOfWeek)) {
        const sessionEps = Math.min(epsPerSession, show.totalEpisodes - epNum + 1);
        for (let i = 0; i < sessionEps; i++) {
          if (epNum > show.totalEpisodes) break;
          episodes.push({
            season,
            episode: ((epNum - 1) % epsPerSeason) + 1,
            title: `S${season}E${((epNum - 1) % epsPerSeason) + 1}`,
            durationMinutes: show.avgEpisodeMinutes,
            watchDate: formatDate(currentDay),
          });
          epNum++;
          if (epNum > epsPerSeason * season && season < show.seasons) {
            season++;
          }
        }
        scheduledDays++;
      }
      dayIndex++;
      if (dayIndex > 60) break;
    }
    setPlan(episodes);
  };

  const toggleDay = (day: number) => {
    setSessionDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const toggleEpisode = (key: string) => {
    setCompletedEps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSavePlan = async () => {
    if (!show || plan.length === 0) return;
    setSaving(true);

    await supabase
      .from('watch_plans')
      .update({ active: false })
      .eq('show_id', showId);

    const { data, error } = await supabase
      .from('watch_plans')
      .insert({
        show_id: showId,
        mood: 'excited',
        available_minutes: sessionMinutes,
        plan_episodes: plan,
        active: true,
      })
      .select()
      .maybeSingle();

    setSaving(false);
    if (!error && data) setSavedPlan(data as WatchPlanType);
  };

  const handleDeletePlan = async () => {
    if (!savedPlan) return;
    await supabase.from('watch_plans').update({ active: false }).eq('id', savedPlan.id);
    setSavedPlan(null);
  };

  if (!show) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-400">Show not found.</p>
      </div>
    );
  }

  const groupedByDate = plan.reduce<Record<string, PlanEpisode[]>>((acc, ep) => {
    const key = ep.watchDate || 'Unscheduled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ep);
    return acc;
  }, {});

  const completionDays = Object.keys(groupedByDate).length;
  const totalTime = plan.length * show.avgEpisodeMinutes;
  const totalHours = Math.floor(totalTime / 60);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold flex items-center gap-2">
                <Calendar size={18} className="text-red-500" />
                Watch Plan
              </h1>
              <p className="text-gray-500 text-sm">{show.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedPlan && (
              <button
                onClick={handleDeletePlan}
                className="flex items-center gap-2 text-gray-500 hover:text-red-400 transition-colors text-sm"
              >
                <Trash2 size={14} />
                Clear Plan
              </button>
            )}
            <button
              onClick={handleSavePlan}
              disabled={saving || plan.length === 0}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <Save size={14} />
              {saving ? 'Saving...' : savedPlan ? 'Update Plan' : 'Save Plan'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Config Panel */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Session Length
            </h3>
            <div className="space-y-2">
              {SESSION_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={() => setSessionMinutes(opt.minutes)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
                    sessionMinutes === opt.minutes
                      ? 'bg-red-600/30 border border-red-600/50 text-white'
                      : 'bg-black/30 border border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Clock size={13} />
                    {opt.label}
                  </span>
                  <span>
                    {Math.floor(opt.minutes / show.avgEpisodeMinutes)} ep
                    {Math.floor(opt.minutes / show.avgEpisodeMinutes) !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Watch Days
            </h3>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  onClick={() => toggleDay(i)}
                  className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                    sessionDays.includes(i)
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                  }`}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Summary */}
          <div className="rounded-2xl bg-gradient-to-b from-red-950/30 to-gray-900 border border-red-800/30 p-6">
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Plan Summary
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Total Episodes</span>
                <span className="text-white font-semibold">{show.totalEpisodes}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Sessions Needed</span>
                <span className="text-white font-semibold">{completionDays}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Total Watch Time</span>
                <span className="text-white font-semibold">{totalHours}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Completion Date</span>
                <span className="text-white font-semibold">
                  {plan[plan.length - 1]?.watchDate || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="lg:col-span-2">
          <h2 className="text-white text-xl font-bold mb-6">Your Schedule</h2>

          {sessionDays.length === 0 ? (
            <div className="rounded-2xl bg-gray-900 border border-gray-800 p-10 text-center">
              <p className="text-gray-500">Select at least one watch day to generate your plan.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([date, eps]) => {
                const sessionDuration = eps.length * show.avgEpisodeMinutes;
                return (
                  <div
                    key={date}
                    className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden"
                  >
                    <div className="px-5 py-3.5 bg-gray-800/50 flex items-center justify-between border-b border-gray-800">
                      <div className="flex items-center gap-3">
                        <Calendar size={14} className="text-red-400" />
                        <span className="text-white font-semibold text-sm">{date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Clock size={12} />
                        <span>{sessionDuration} min · {eps.length} episode{eps.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-800">
                      {eps.map((ep) => {
                        const key = `${ep.season}-${ep.episode}`;
                        const done = completedEps.has(key);
                        return (
                          <button
                            key={key}
                            onClick={() => toggleEpisode(key)}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-800/50 transition-colors text-left"
                          >
                            {done ? (
                              <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle size={18} className="text-gray-600 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <div className={`font-semibold text-sm ${done ? 'text-gray-600 line-through' : 'text-white'}`}>
                                Season {ep.season} · Episode {ep.episode}
                              </div>
                            </div>
                            <span className="text-gray-600 text-xs">{ep.durationMinutes} min</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
