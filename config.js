// API Configuration
const DEV_API_URL = 'http://localhost:3000';
const PROD_API_URL = 'https://your-vercel-app-url.vercel.app'; // Replace with your actual Vercel URL

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// Configure fetch timeout
export const FETCH_TIMEOUT = 30000; // 30 seconds

// Helper function for API requests with timeout
export const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        'Accept': 'application/json',
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