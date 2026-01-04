import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "../api/axios.js";

const INTERACTION_THRESHOLD = 50; // Clear cache after 50 interactions
const CACHE_KEY = "trendingComplaintsCache";
const INTERACTION_COUNT_KEY = "trendingInteractionCount";

const fetchTrendingComplaints = async ({ pageParam }) => {
  try {
    const { data } = await axiosInstance.get("/complaints/trending", {
      params: {
        cursor: pageParam,
        limit: 9,
      }
    });
    
    // console.log("API Response:", data);
    
    return {
      complaints: data.data || [],
      nextCursor: data.nextCursor,
      hasNextPage: data.hasNextPage,
    };
  } catch (error) {
    console.error("Error fetching trending complaints:", error);
    throw error;
  }
};

export const useTrendingComplaintsCache = () => {
  const queryClient = useQueryClient();
  
  // Get Redux complaints to merge with cached data for real-time updates
  const reduxComplaints = useSelector((state) => state.complaints.complaints || []);
  
  // State to track interactions
  const [interactionCount, setInteractionCount] = useState(() => {
    const stored = sessionStorage.getItem(INTERACTION_COUNT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });
  
  // State to track if we're using cached data
  const [isUsingCache, setIsUsingCache] = useState(false);
  
  // Ref to store the cached order of complaint IDs
  const cachedOrderRef = useRef(null);
  
  // Ref to track if cache has been initialized
  const cacheInitialized = useRef(false);

  // Main query
  const query = useInfiniteQuery({
    queryKey: ["trendingComplaints"],
    queryFn: fetchTrendingComplaints,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.nextCursor : undefined;
    },
    initialPageParam: undefined,
    staleTime: Infinity, // Keep data fresh since we're managing cache ourselves
    gcTime: Infinity, // Don't garbage collect (formerly cacheTime)
  });

  // Initialize cache when data is first loaded
  useEffect(() => {
    if (query.data && !cacheInitialized.current) {
      // Extract all complaint IDs in order across all pages
      const allComplaintIds = [];
      query.data.pages.forEach(page => {
        page.complaints.forEach(complaint => {
          allComplaintIds.push(complaint._id);
        });
      });
      
      // Store the order in ref
      cachedOrderRef.current = allComplaintIds;
      cacheInitialized.current = true;
      setIsUsingCache(true);
      
      // console.log("Cache initialized with", allComplaintIds.length, "complaints");
      
      // Store in sessionStorage as backup
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(allComplaintIds));
    }
  }, [query.data]);

  // Update interaction count in sessionStorage
  useEffect(() => {
    sessionStorage.setItem(INTERACTION_COUNT_KEY, interactionCount.toString());
  }, [interactionCount]);

  // Function to increment interaction count
  const recordInteraction = useCallback(() => {
    setInteractionCount(prev => {
      const newCount = prev + 1;
      // console.log(`Interaction recorded: ${newCount}/${INTERACTION_THRESHOLD}`);
      
      // Check if we've reached the threshold
      if (newCount >= INTERACTION_THRESHOLD) {
        // console.log("Interaction threshold reached! Cache will be cleared on next fetch.");
      }
      
      return newCount;
    });
  }, []);

  // Function to clear cache and refetch
  const clearCacheAndRefetch = useCallback(() => {
    // console.log("Clearing cache and refetching trending complaints...");
    
    // Clear cache refs
    cachedOrderRef.current = null;
    cacheInitialized.current = false;
    
    // Clear sessionStorage
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(INTERACTION_COUNT_KEY);
    
    // Reset interaction count
    setInteractionCount(0);
    setIsUsingCache(false);
    
    // Invalidate and refetch the query
    queryClient.invalidateQueries({ queryKey: ["trendingComplaints"] });
    queryClient.refetchQueries({ queryKey: ["trendingComplaints"] });
  }, [queryClient]);

  // Auto-clear cache when threshold is reached
  useEffect(() => {
    if (interactionCount >= INTERACTION_THRESHOLD && isUsingCache) {
      clearCacheAndRefetch();
    }
  }, [interactionCount, isUsingCache, clearCacheAndRefetch]);

  // Function to get cached data with preserved order BUT updated vote counts
  const getCachedData = useCallback(() => {
    if (!query.data || !cachedOrderRef.current) {
      return query.data;
    }

    // Create a map of complaint ID to complaint data for quick lookup from API
    const complaintMap = new Map();
    query.data.pages.forEach(page => {
      page.complaints.forEach(complaint => {
        complaintMap.set(complaint._id, complaint);
      });
    });

    // Create a map from Redux for real-time vote counts
    const reduxMap = new Map();
    reduxComplaints.forEach(complaint => {
      reduxMap.set(complaint._id || complaint.id, complaint);
    });

    // Reconstruct pages in the cached order with merged data
    const reorderedPages = [];
    const pageSize = 9; // Same as the limit in the query
    
    for (let i = 0; i < cachedOrderRef.current.length; i += pageSize) {
      const pageComplaintIds = cachedOrderRef.current.slice(i, i + pageSize);
      const pageComplaints = pageComplaintIds
        .map(id => {
          const apiComplaint = complaintMap.get(id);
          const reduxComplaint = reduxMap.get(id);
          
          if (!apiComplaint) return null;
          
          // Merge: use API data as base, but override with Redux vote counts if available
          return {
            ...apiComplaint,
            // Override vote counts from Redux if available (real-time updates)
            upvote: reduxComplaint?.upvote ?? apiComplaint.upvote,
            downvote: reduxComplaint?.downvote ?? apiComplaint.downvote,
            // Also merge comments if Redux has them
            comments: reduxComplaint?.comments ?? apiComplaint.comments,
            // Keep user vote status from Redux
            userVote: reduxComplaint?.userVote ?? apiComplaint.userVote,
          };
        })
        .filter(Boolean); // Filter out any complaints that might have been deleted
      
      if (pageComplaints.length > 0) {
        const pageIndex = Math.floor(i / pageSize);
        const originalPage = query.data.pages[pageIndex];
        
        // Use the original page's hasNextPage and nextCursor to preserve pagination
        reorderedPages.push({
          complaints: pageComplaints,
          nextCursor: originalPage?.nextCursor,
          hasNextPage: originalPage?.hasNextPage ?? false,
        });
      }
    }
    
    // If there are more pages in the API data than in the cache, add them
    if (query.data.pages.length > reorderedPages.length) {
      const additionalPages = query.data.pages.slice(reorderedPages.length);
      
      // Collect only NEW complaint IDs (not already in cache) to add
      const newComplaintIds = [];
      additionalPages.forEach(page => {
        page.complaints.forEach(complaint => {
          if (!cachedOrderRef.current.includes(complaint._id)) {
            newComplaintIds.push(complaint._id);
          }
        });
      });
      
      // Add new IDs to cache
      cachedOrderRef.current.push(...newComplaintIds);
      
      // Now reconstruct the new pages with proper page size (9 complaints each)
      const allNewComplaints = [];
      additionalPages.forEach(page => {
        page.complaints.forEach(complaint => {
          // Only include if it's a NEW complaint (not a duplicate)
          if (newComplaintIds.includes(complaint._id)) {
            allNewComplaints.push(complaint);
          }
        });
      });
      
      // Split into properly sized pages
      for (let i = 0; i < allNewComplaints.length; i += pageSize) {
        const pageComplaints = allNewComplaints.slice(i, i + pageSize);
        const hasMore = i + pageSize < allNewComplaints.length || 
                        (additionalPages[additionalPages.length - 1]?.hasNextPage ?? false);
        
        reorderedPages.push({
          complaints: pageComplaints,
          nextCursor: hasMore ? additionalPages[Math.floor(i / pageSize)]?.nextCursor : null,
          hasNextPage: hasMore,
        });
      }
      
      // Update sessionStorage
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cachedOrderRef.current));
      
      // console.log(`Cache expanded: ${newComplaintIds.length} new complaints added. Total: ${cachedOrderRef.current.length}`);
      
      // If the last page has fewer complaints than pageSize AND there's a next page,
      // it means we filtered out duplicates. We should signal to fetch more.
      const lastPage = reorderedPages[reorderedPages.length - 1];
      if (lastPage && lastPage.complaints.length < pageSize && lastPage.hasNextPage) {
        // console.log(`⚠️ Page ${reorderedPages.length} has only ${lastPage.complaints.length} complaints (duplicates filtered). Consider fetching more.`);
      }
    }

    return {
      pages: reorderedPages,
      pageParams: query.data.pageParams,
    };
  }, [query.data, reduxComplaints]);

  // Return the cached data if using cache, otherwise return original data
  const data = isUsingCache ? getCachedData() : query.data;

  return {
    ...query,
    data,
    interactionCount,
    recordInteraction,
    clearCacheAndRefetch,
    isUsingCache,
    interactionsRemaining: Math.max(0, INTERACTION_THRESHOLD - interactionCount),
  };
};
