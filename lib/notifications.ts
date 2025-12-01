import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getPlayerHunts, getLocationsForHunt, getConditionsForLocation, getHuntById } from './database-service';
import { convertUTCTimeToLocal } from './database-service';

export const setupNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleHuntNotifications = async (userId: string) => {
  try {
    const playerHunts = await getPlayerHunts(userId);
    const activeHunts = playerHunts.filter(h => h.status === 'STARTED');

    for (const hunt of activeHunts) {
      const locations = await getLocationsForHunt(hunt.huntId);
      
      for (const location of locations) {
        const conditions = await getConditionsForLocation(location.locationId);
        const timeConditions = conditions.filter(c => c.type === 'TIME_WINDOW');

        for (const condition of timeConditions) {
          if (condition.startTime) {
            const localTime = convertUTCTimeToLocal(condition.startTime);
            const [hours, minutes] = localTime.split(':').map(Number);
            
            const now = new Date();
            const notificationTime = new Date();
            notificationTime.setHours(hours, minutes, 0, 0);
            
            // Schedule 30 minutes before
            notificationTime.setMinutes(notificationTime.getMinutes() - 30);

            if (notificationTime > now) {
              const huntData = await getHuntById(hunt.huntId);
              
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Hunt Available!',
                  body: `The location in '${huntData?.name || 'Hunt'}' is opening at ${localTime}`,
                  data: { huntId: hunt.huntId, locationId: location.locationId },
                },
                trigger: {
                  date: notificationTime,
                },
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('Error scheduling notifications:', error);
  }
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
