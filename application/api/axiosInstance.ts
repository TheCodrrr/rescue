import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for the API
// For Android emulator: use 10.0.2.2 instead of localhost
// For iOS simulator: use localhost or your computer's IP
// For physical device: use your computer's IP address (e.g., 192.168.1.x)
// const baseURL = 'http://10.0.2.2:5000/api/v1'; // Android emulator
const baseURL = 'http://10.110.97.57:5000/api/v1'; // Physical device - your computer's IP

console.log("Axios base URL:", baseURL);

const axiosInstance = axios.create({
    baseURL: baseURL,
    withCredentials: false, // Set to false for mobile - cookies don't work the same way
})

// Add a request interceptor to include the token in all requests
axiosInstance.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
                console.log("Added Authorization header to request:", config.url);
            } else {
                console.log("No token found for request:", config.url);
            }
        } catch (error) {
            console.error("Error reading token from AsyncStorage:", error);
        }
        return config;
    },
    (error) => {
        console.error("Request interceptor error:", error);
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
    (response) => {
        console.log("API Response successful:", response.config.url, response.status);
        return response;
    },
    async (error) => {
        console.error("API Response error:", error.config?.url, error.response?.status);
        
        if (error.response?.status === 401) {
            const isLoginRequest = error.config?.url?.includes('/login');
            
            if (!isLoginRequest) {
                console.log("Unauthorized request - clearing token");
                // Token is invalid/expired, clear AsyncStorage
                try {
                    await AsyncStorage.removeItem('token');
                    await AsyncStorage.removeItem('isLoggedIn');
                } catch (storageError) {
                    console.error("Error clearing AsyncStorage:", storageError);
                }
                // Note: Navigation to login should be handled by the app's navigation logic
            } else {
                console.log("Login attempt failed - not clearing token");
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
