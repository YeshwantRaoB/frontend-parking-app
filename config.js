// API Configuration
const DEV_API_URL = 'https://server-parking-app.vercel.app';
const PROD_API_URL = 'https://server-parking-app.vercel.app';

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// Helper function to construct API URLs
export const apiUrl = (path) => {
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

// Configure fetch timeout
export const FETCH_TIMEOUT = 30000; // 30 seconds

// Helper function for API requests with timeout
export const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    // Ensure URL is properly formatted
    const fullUrl = url.startsWith('http') ? url : apiUrl(url);
    
    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      credentials: 'include', // Include credentials (cookies) with the request
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};