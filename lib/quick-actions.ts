import { QuickActionId, QuickActionParams, useQuickActionRouting } from 'expo-quick-actions';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export const setupQuickActions = () => {
  // Quick actions are configured in app.json plugin
  // This function can be used for any runtime setup if needed
};

export const useQuickActions = () => {
  const router = useRouter();

  useQuickActionRouting((action, router) => {
    if (action.id === 'active-hunts') {
      router.push('/MyActiveHunts');
    } else if (action.id === 'completed-hunts') {
      router.push('/MyCompletedHunts');
    } else if (action.id === 'profile') {
      router.push('/Profile');
    }
  });
};
