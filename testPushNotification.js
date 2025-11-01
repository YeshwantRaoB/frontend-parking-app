/**
 * Test Script for Sending Push Notifications
 * 
 * This script allows you to test sending push notifications to your app.
 * You can run this from your server or locally to verify notifications work.
 * 
 * Prerequisites:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Download your Firebase service account key JSON file
 * 3. Update the path to your service account key below
 * 4. Get the FCM token from your app's console logs
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
// Replace this path with your actual service account key file
const serviceAccount = require(path.join(__dirname, 'parking-app-4b33b-firebase-adminsdk-fbsvc-0e54d2d164.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Send a test notification to a specific device
 * @param {string} fcmToken - The FCM token from the device
 */
async function sendTestNotification(fcmToken) {
  try {
    console.log('Sending test notification to token:', fcmToken);

    const message = {
      notification: {
        title: '🎉 Test Notification',
        body: 'This is a test push notification from your server!',
      },
      data: {
        screen: 'Home',
        customData: 'You can add any custom data here',
        timestamp: new Date().toISOString(),
      },
      token: fcmToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Successfully sent notification:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    throw error;
  }
}

/**
 * Send notification to multiple devices
 * @param {string[]} fcmTokens - Array of FCM tokens
 */
async function sendMulticastNotification(fcmTokens) {
  try {
    console.log(`Sending notification to ${fcmTokens.length} devices...`);

    const message = {
      notification: {
        title: '📢 Broadcast Notification',
        body: 'This notification was sent to multiple devices!',
      },
      data: {
        type: 'broadcast',
        timestamp: new Date().toISOString(),
      },
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Successfully sent: ${response.successCount}`);
    console.log(`❌ Failed: ${response.failureCount}`);
    
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Token ${fcmTokens[idx]} failed:`, resp.error);
        }
      });
    }

    return response;
  } catch (error) {
    console.error('❌ Error sending multicast notification:', error);
    throw error;
  }
}

/**
 * Send a parking-related notification (customize for your app)
 * @param {string} fcmToken - The FCM token
 * @param {object} parkingData - Parking information
 */
async function sendParkingNotification(fcmToken, parkingData) {
  try {
    const { vehicleNumber, location, status } = parkingData;

    const message = {
      notification: {
        title: `🚗 Parking ${status}`,
        body: `Vehicle ${vehicleNumber} - ${location}`,
      },
      data: {
        type: 'parking_update',
        vehicleNumber,
        location,
        status,
        timestamp: new Date().toISOString(),
      },
      token: fcmToken,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          color: '#4a90e2',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Parking notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending parking notification:', error);
    throw error;
  }
}

// Example usage
if (require.main === module) {
  // Replace this with the actual FCM token from your device
  const FCM_TOKEN = 'YOUR_FCM_TOKEN_HERE';
  
  console.log('🚀 Starting notification test...\n');

  // Test 1: Send a simple test notification
  sendTestNotification(FCM_TOKEN)
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      console.log('\nCheck your phone for the notification.');
      console.log('If you don\'t see it, check the console logs in your app.\n');
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error.message);
      console.log('\nTroubleshooting:');
      console.log('1. Make sure the FCM token is correct');
      console.log('2. Verify the service account key file path is correct');
      console.log('3. Check that Firebase is properly configured');
      console.log('4. Ensure the device has internet connection\n');
    })
    .finally(() => {
      process.exit(0);
    });

  // Uncomment to test parking notification
  // sendParkingNotification(FCM_TOKEN, {
  //   vehicleNumber: 'ABC-1234',
  //   location: 'Parking Lot A',
  //   status: 'Approved'
  // });

  // Uncomment to test multicast (multiple devices)
  // const tokens = ['token1', 'token2', 'token3'];
  // sendMulticastNotification(tokens);
}

// Export functions for use in other files
module.exports = {
  sendTestNotification,
  sendMulticastNotification,
  sendParkingNotification,
};

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Install dependencies:
 *    npm install firebase-admin
 * 
 * 2. Get your FCM token:
 *    - Run your app on a physical device
 *    - Check the console logs for "FCM token obtained: ..."
 *    - Copy that token
 * 
 * 3. Update this file:
 *    - Replace 'YOUR_FCM_TOKEN_HERE' with your actual token
 *    - Verify the service account key path is correct
 * 
 * 4. Run the script:
 *    node testPushNotification.js
 * 
 * 5. Check your phone for the notification!
 */
