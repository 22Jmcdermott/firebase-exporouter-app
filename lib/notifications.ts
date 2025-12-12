/**
 * Notifications Service - Handles local push notifications for hunt timing
 * Schedules notifications based on hunt location time windows
 * Notifies users 30 minutes before locations become available
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { getPlayerHunts, getHuntLocations, getLocationConditions, getHuntById } from './database-service';
import { convertUTCTimeToLocal } from './database-service';

/**
 * Sets up notification permissions and channels
 * Must be called before scheduling notifications
 * @returns {Promise<boolean>} True if permissions granted
 */
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

/**
 * Schedules notifications for all active hunts for a user
 * Finds all time-window conditions and schedules notifications 30 minutes before
 * Converts UTC times to local timezone for accurate scheduling
 * @param {string} userId - ID of the user to schedule notifications for
 */
export const scheduleHuntNotifications = async (userId: string) => {
  try {
    const playerHunts = await getPlayerHunts(userId);
    const activeHunts = playerHunts.filter(h => h.status === 'STARTED');

    for (const hunt of activeHunts) {
      const locations = await getHuntLocations(hunt.huntId);
      
      for (const location of locations) {
        if (!location.locationId) continue;
        const conditions = await getLocationConditions(location.locationId);
        const timeConditions = conditions.filter((c: any) => c.type === 'TIME_WINDOW');

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
                  type: SchedulableTriggerInputTypes.DATE,
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

/**
 * Cancels all scheduled notifications for the app
 * Useful when user signs out or disables notifications
 */
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
