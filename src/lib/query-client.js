import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			// Refetch stale data when component mounts, window regains focus, or reconnects.
			// staleTime is still 24h so normal navigations don't trigger unnecessary fetches.
			// Real-time subscriptions call invalidateQueries() which marks data stale immediately,
			// so the next mount/focus will always re-fetch invalidated data.
			refetchOnWindowFocus: true,
			refetchOnMount: true,
			refetchOnReconnect: true,
			retry: 1,
			staleTime: 1000 * 60 * 60 * 24, // 24 hours — stays fresh unless invalidated by subscription
			gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep unused queries in cache
		},
	},
});