import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "../api/axios.js";

const INTERACTION_THRESHOLD = 50; // Clear cache after 50 interactions
const CACHE_KEY = "myComplaintsCache";
const INTERACTION_COUNT_KEY = "myComplaintsInteractionCount";

const fetchMyComplaints = async ({ pageParam }) => {
  try {
    const { data } = await axiosInstance.get("/complaints/my-complaints", {
      params: {
        cursor: pageParam,
        limit: 9,
      }
    });
    
    console.log("My Complaints API Response:", data);
    
    return {
      complaints: data.data || [],
      nextCursor: data.nextCursor,
      hasNextPage: data.hasNextPage,
    };
  } catch (error) {
    console.error("Error fetching my complaints:", error);
    throw error;
  }
};

export const useMyComplaintsCache = () => {
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
    queryKey: ["myComplaints"],
    queryFn: fetchMyComplaints,
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
      
      console.log("My Complaints cache initialized with", allComplaintIds.length, "complaints");
      
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
      console.log(`My Complaints interaction recorded: ${newCount}/${INTERACTION_THRESHOLD}`);
      
      // Check if we've reached the threshold
      if (newCount >= INTERACTION_THRESHOLD) {
        console.log("Interaction threshold reached! Cache will be cleared on next fetch.");
      }
      
      return newCount;
    });
  }, []);

  // Function to clear cache and refetch
  const clearCacheAndRefetch = useCallback(() => {
    console.log("Clearing My Complaints cache and refetching...");
    
    // Clear cache refs
    cachedOrderRef.current = null;
    cacheInitialized.current = false;
    
    // Clear sessionStorage
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(INTERACTION_COUNT_KEY);
    
    // Reset interaction count
    setInteractionCount(0);
    setIsUsingCache(false);
    
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ["myComplaints"] });
    queryClient.refetchQueries({ queryKey: ["myComplaints"] });
  }, [queryClient]);

  // Auto-clear cache when threshold is reached
  useEffect(() => {
    if (interactionCount >= INTERACTION_THRESHOLD) {
      clearCacheAndRefetch();
    }
  }, [interactionCount, clearCacheAndRefetch]);

  // Merge cached data with Redux updates for real-time sync
  const mergedData = query.data ? {
    ...query.data,
    pages: query.data.pages.map(page => {
      const updatedComplaints = page.complaints.map(cachedComplaint => {
        // Find if this complaint has been updated in Redux
        const reduxComplaint = reduxComplaints.find(rc => rc._id === cachedComplaint._id);
        
        // If found in Redux, merge the updates (votes, comments, etc.)
        if (reduxComplaint) {
          return {
            ...cachedComplaint,
            upvote: reduxComplaint.upvote ?? cachedComplaint.upvote,
            downvote: reduxComplaint.downvote ?? cachedComplaint.downvote,
            userVote: reduxComplaint.userVote ?? cachedComplaint.userVote,
            comments: reduxComplaint.comments ?? cachedComplaint.comments,
            status: reduxComplaint.status ?? cachedComplaint.status,
          };
        }
        
        return cachedComplaint;
      });
      
      return {
        ...page,
        complaints: updatedComplaints,
      };
    }),
  } : undefined;

  return {
    data: mergedData,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    status: query.status,
    error: query.error,
    refetch: query.refetch,
    interactionCount,
    recordInteraction,
    clearCacheAndRefetch,
    isUsingCache,
    interactionsRemaining: Math.max(0, INTERACTION_THRESHOLD - interactionCount),
  };
};
