import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axios.js";

const INTERACTION_THRESHOLD = 50; // Clear cache after 50 interactions
const CACHE_KEY_PREFIX = "userHistoryCache";
const INTERACTION_COUNT_KEY_PREFIX = "userHistoryInteractionCount";

const fetchUserHistory = async ({ pageParam, userId, filters }) => {
  try {
    const params = {
      cursor: pageParam,
      limit: 10,
      user_id: userId,
      sort: filters.sortOrder || 'desc',
    };

    // Add filters if they're not 'all'
    if (filters.actionType && filters.actionType !== 'all') {
      params.actionType = filters.actionType;
    }
    if (filters.category && filters.category !== 'all') {
      params.category = filters.category;
    }

    const { data } = await axiosInstance.get("/history", { params });
    
    console.log("User History API Response:", data);
    
    return {
      histories: data.histories || [],
      nextCursor: data.nextCursor,
      hasNextPage: data.hasNextPage,
      totalCount: data.totalCount || 0,
    };
  } catch (error) {
    console.error("Error fetching user history:", error);
    throw error;
  }
};

export const useUserHistoryCache = (userId, filters = {}) => {
  const queryClient = useQueryClient();
  
  // Generate cache keys based on userId and filters
  const filterKey = `${filters.actionType || 'all'}_${filters.category || 'all'}_${filters.sortOrder || 'desc'}`;
  const CACHE_KEY = `${CACHE_KEY_PREFIX}_${userId}_${filterKey}`;
  const INTERACTION_COUNT_KEY = `${INTERACTION_COUNT_KEY_PREFIX}_${userId}_${filterKey}`;
  
  // State to track interactions
  const [interactionCount, setInteractionCount] = useState(() => {
    const stored = sessionStorage.getItem(INTERACTION_COUNT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });
  
  // State to track if we're using cached data
  const [isUsingCache, setIsUsingCache] = useState(false);

  // Main query
  const query = useInfiniteQuery({
    queryKey: ["userHistory", userId, filters.actionType, filters.category, filters.sortOrder],
    queryFn: ({ pageParam }) => fetchUserHistory({ pageParam, userId, filters }),
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.nextCursor : undefined;
    },
    initialPageParam: undefined,
    enabled: !!userId, // Only run query if userId is available
    staleTime: Infinity, // Keep data fresh since we're managing cache ourselves
    gcTime: Infinity, // Don't garbage collect (formerly cacheTime)
  });

  // Initialize cache when data is first loaded
  useEffect(() => {
    if (query.data) {
      setIsUsingCache(true);
      
      // Extract all history IDs in order across all pages
      const allHistoryIds = [];
      query.data.pages.forEach(page => {
        page.histories.forEach(history => {
          allHistoryIds.push(history._id);
        });
      });
      
      console.log("History cache initialized with", allHistoryIds.length, "records");
      
      // Store in sessionStorage as backup
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(allHistoryIds));
    }
  }, [query.data, CACHE_KEY]);

  // Update interaction count in sessionStorage
  useEffect(() => {
    sessionStorage.setItem(INTERACTION_COUNT_KEY, interactionCount.toString());
  }, [interactionCount, INTERACTION_COUNT_KEY]);

  // Function to increment interaction count
  const recordInteraction = useCallback(() => {
    setInteractionCount(prev => {
      const newCount = prev + 1;
      console.log(`History interaction recorded: ${newCount}/${INTERACTION_THRESHOLD}`);
      
      // Check if we've reached the threshold
      if (newCount >= INTERACTION_THRESHOLD) {
        console.log("Interaction threshold reached! Clearing cache and refetching...");
        
        // Clear the cache and refetch
        queryClient.invalidateQueries({ queryKey: ["userHistory", userId] });
        
        // Reset interaction count
        sessionStorage.removeItem(INTERACTION_COUNT_KEY);
        return 0;
      }
      
      return newCount;
    });
  }, [queryClient, userId, INTERACTION_COUNT_KEY]);

  // Function to manually clear cache and refetch
  const clearCacheAndRefetch = useCallback(() => {
    console.log("Manually clearing history cache and refetching...");
    
    // Clear session storage
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(INTERACTION_COUNT_KEY);
    
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ["userHistory", userId] });
    
    // Reset states
    setInteractionCount(0);
    setIsUsingCache(false);
  }, [queryClient, userId, CACHE_KEY, INTERACTION_COUNT_KEY]);

  // Calculate interactions remaining until cache clear
  const interactionsRemaining = INTERACTION_THRESHOLD - interactionCount;

  // Get total count from the first page
  const totalCount = query.data?.pages?.[0]?.totalCount || 0;

  return {
    data: query.data,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    status: query.status,
    error: query.error,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    interactionCount,
    recordInteraction,
    clearCacheAndRefetch,
    isUsingCache,
    interactionsRemaining,
    totalCount,
  };
};
