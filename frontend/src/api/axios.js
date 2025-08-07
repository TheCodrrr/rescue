import axios from "axios";

const axiosInstance = axios.create({
    baseURL: import.meta.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
    withCredentials: true,
})

// Add a request interceptor to include the token in all requests
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log("Added Authorization header to request:", config.url);
        } else {
            console.log("No token found for request:", config.url);
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
    (error) => {
        console.error("API Response error:", error.config?.url, error.response?.status);
        
        if (error.response?.status === 401) {
            console.log("Unauthorized request - clearing token and redirecting to login");
            // Token is invalid/expired, clear localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('isLoggedIn');
            // Optionally redirect to login page
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;