import { useInfiniteQuery } from "@tanstack/react-query";
import axiosInstance from "../api/axios.js";

const fetchTrendingComplaints = async ({ pageParam }) => {
  try {
    const { data } = await axiosInstance.get("/complaints/trending", {
      params: {
        cursor: pageParam,
        limit: 10,
      }
    });
    
    console.log("API Response:", data);
    
    // Return the data in the expected format
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

export const useTrendingComplaints = () => {
  return useInfiniteQuery({
    queryKey: ["trendingComplaints"],
    queryFn: fetchTrendingComplaints,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.nextCursor : undefined;
    },
    initialPageParam: undefined, // Start with no cursor for the first page
  });
};