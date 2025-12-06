import * as QuickActions from 'expo-quick-actions';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export const setupQuickActions = () => {
  // Quick actions are configured in app.config.js plugin
  // This function can be used for any runtime setup if needed
};

export const useQuickActions = () => {
  const router = useRouter();

  useEffect(() => {
    // Quick Actions only work in development builds, not in Expo Go
    // Subscribe to action events if the API is available
    if (QuickActions.initial) {
      const subscription = QuickActions.addListener((action) => {
        if (action.id === 'active-hunts') {
          router.push('/MyActiveHunts');
        } else if (action.id === 'completed-hunts') {
          router.push('/MyCompletedHunts');
        } else if (action.id === 'profile') {
          router.push('/Profile');
        }
      });

      return () => subscription?.remove();
    }
  }, [router]);
};
