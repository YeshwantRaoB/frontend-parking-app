import { API_BASE_URL } from '../config';

export const testNetworkConnection = async () => {
  try {
    console.log('Testing network connection to:', API_BASE_URL);
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Network test successful:', data);
      return { success: true, data };
    } else {
      console.log('Network test failed with status:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('Network test error:', error.message);
    return { success: false, error: error.message };
  }
};