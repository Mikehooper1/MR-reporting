import React, { useEffect } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

const UpdateCheck = () => {
  const checkForUpdates = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new version of the app is available. Would you like to update now?',
          [
            {
              text: 'Later',
              style: 'cancel'
            },
            {
              text: 'Update',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    'Update Downloaded',
                    'The update has been downloaded. The app will now restart to apply the changes.',
                    [
                      {
                        text: 'OK',
                        onPress: async () => {
                          await Updates.reloadAsync();
                        }
                      }
                    ]
                  );
                } catch (error) {
                  Alert.alert(
                    'Error',
                    'Failed to download the update. Please try again later.'
                  );
                  console.error('Error downloading update:', error);
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  useEffect(() => {
    if (!__DEV__) {
      checkForUpdates();
    }
  }, []);

  return null;
};

export default UpdateCheck; 