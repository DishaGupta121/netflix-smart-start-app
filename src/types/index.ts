export type Mood =
  | 'relaxed'
  | 'excited'
  | 'sad'
  | 'focused'
  | 'adventurous'
  | 'romantic'
  | 'anxious'
  | 'social';

export type WatchingWith = 'alone' | 'partner' | 'family' | 'friends';
export type ResumeDifficulty = 'easy' | 'medium' | 'hard';
export type WatchStatus = 'watching' | 'completed' | 'dropped' | 'paused';
export type ContentType = 'series' | 'movie' | 'documentary' | 'miniseries';

export interface Character {
  name: string;
  role: string;
  initial: string;
  color: string;
}

export interface Show {
  id: string;
  title: string;
  tagline: string;
  description: string;
  genres: string[];
  contentType: ContentType;
  seasons: number;
  totalEpisodes: number;
  avgEpisodeMinutes: number;
  totalMinutes: number;
  imageUrl: string;
  backdropUrl: string;
  rating: number;
  completionRate: number;
  worthItScore: number;
  bingeScore: number;
  complexityLevel: 1 | 2 | 3 | 4 | 5;
  resumeDifficulty: ResumeDifficulty;
  moodTags: Mood[];
  watchingWithTags: WatchingWith[];
  releaseYear: number;
  language: 'en' | 'hi';
  criticsQuote?: string;
  bestStartingPoint?: string;
  whyWorthIt: string[];
  whyNotWorthIt: string[];
  recapTips: string[];
  characters: Character[];
  lastEpisodeSummary: string;
  thirtySecondRecap: string;
}

export interface WatchProgress {
  id: string;
  show_id: string;
  season_num: number;
  episode_num: number;
  last_watched_at: string;
  total_minutes_watched: number;
  status: WatchStatus;
  created_at: string;
  updated_at: string;
}

export interface WatchPlan {
  id: string;
  show_id: string;
  mood: string;
  available_minutes: number;
  plan_episodes: PlanEpisode[];
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface PlanEpisode {
  season: number;
  episode: number;
  title: string;
  durationMinutes: number;
  watchDate?: string;
  notes?: string;
}

export interface MoodSession {
  id: string;
  mood: Mood;
  available_minutes: number;
  show_ids_recommended: string[];
  created_at: string;
}

export type Page =
  | 'home'
  | 'smart-start'
  | 'show-detail'
  | 'watch-plan'
  | 'resume-helper'
  | 'my-list';

export interface AppState {
  currentPage: Page;
  selectedShowId: string | null;
  smartStartMood: Mood | null;
  smartStartMinutes: number | null;
}
