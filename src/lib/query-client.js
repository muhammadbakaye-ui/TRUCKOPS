import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			refetchOnReconnect: false,
			retry: 1,
			staleTime: 1000 * 60 * 60 * 24, // 24 hours - data is fresh for a day
			gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep unused queries in cache
		},
	},
});