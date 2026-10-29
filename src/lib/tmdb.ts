const BASE_URL = 'https://api.themoviedb.org/3';

const headers = () => ({
  Authorization: `Bearer ${import.meta.env.VITE_TMDB_TOKEN}`,
  'Content-Type': 'application/json',
});

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`TMDb ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export interface TMDbMovie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type?: string;
  genre_ids: number[];
}

export interface TMDbPagedResult<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDbMovieDetails extends TMDbMovie {
  genres: { id: number; name: string }[];
  runtime: number | null;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status: string;
  tagline: string;
}

export function posterUrl(path: string | null, size: 'w342' | 'w500' | 'w780' = 'w500'): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size: 'w1280' | 'original' = 'w1280'): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function fetchTrending(
  mediaType: 'all' | 'movie' | 'tv' = 'all',
  timeWindow: 'day' | 'week' = 'week',
): Promise<TMDbPagedResult<TMDbMovie>> {
  return get(`/trending/${mediaType}/${timeWindow}`);
}

export function fetchPopularMovies(page = 1): Promise<TMDbPagedResult<TMDbMovie>> {
  return get('/movie/popular', { page: String(page) });
}

export function fetchPopularTV(page = 1): Promise<TMDbPagedResult<TMDbMovie>> {
  return get('/tv/popular', { page: String(page) });
}

export function searchContent(query: string, page = 1): Promise<TMDbPagedResult<TMDbMovie>> {
  return get('/search/multi', { query, page: String(page), include_adult: 'false' });
}

export function fetchMovieDetails(id: number): Promise<TMDbMovieDetails> {
  return get(`/movie/${id}`);
}

export function fetchTVDetails(id: number): Promise<TMDbMovieDetails> {
  return get(`/tv/${id}`);
}
