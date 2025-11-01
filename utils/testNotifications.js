import * as Notifications from 'expo-notifications';

/**
 * Send a local test notification to verify notification setup
 */
export const sendLocalTestNotification = async () => {
  try {
    console.log('Sending local test notification...');
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification 🔔",
        body: "If you can see this, notifications are working!",
        data: { testData: 'This is test data' },
      },
      trigger: null, // Show immediately
    });
    
    console.log('Local test notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending local test notification:', error);
    return false;
  }
};

/**
 * Send a scheduled test notification
 */
export const sendScheduledTestNotification = async (seconds = 5) => {
  try {
    console.log(`Scheduling test notification in ${seconds} seconds...`);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Scheduled Test Notification ⏰",
        body: `This notification was scheduled ${seconds} seconds ago!`,
        data: { scheduled: true },
      },
      trigger: { seconds },
    });
    
    console.log('Scheduled test notification set successfully');
    return true;
  } catch (error) {
    console.error('Error scheduling test notification:', error);
    return false;
  }
};

/**
 * Get notification permissions status
 */
export const getNotificationPermissionStatus = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    console.log('Current notification permission status:', status);
    return status;
  } catch (error) {
    console.error('Error getting notification permission status:', error);
    return null;
  }
};

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log('Notification permission request result:', status);
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};
