import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-config';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withDelay,
  withSequence
} from 'react-native-reanimated';

/**
 * SplashScreen Component
 * Purpose: Initial loading screen that determines user authentication status
 * and navigates to appropriate screen based on session validity
 */
const SplashScreen = () => {
  // ============================================================================
  // State Management
  // ============================================================================
  
  const [isChecking, setIsChecking] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  
  // Simplified animation values
  const contentOpacity = useSharedValue(0);

  // ============================================================================
  // Animation Styles
  // ============================================================================
  
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  // ============================================================================
  // Effects & Authentication Logic
  // ============================================================================
  
  /**
   * STEP 1: Initialize simple fade-in animation when component mounts
   */
  useEffect(() => {
    // Simple fade-in animation for all content
    contentOpacity.value = withSpring(1, { duration: 1000 });
  }, []);

  /**
   * STEP 2: Check authentication status using Firebase Auth State Listener
   * This is the core logic that determines user session validity
   */
  useEffect(() => {
    let mounted = true;
    let navigationComplete = false;
    
    // Minimum splash screen display time (2 seconds for branding)
    const minDisplayTime = 2000;
    // Maximum splash screen time (5 seconds as fallback)
    const maxDisplayTime = 5000;
    const startTime = Date.now();
    
    console.log('🔄 [SplashScreen] Starting authentication check...');
    console.log('🔄 [SplashScreen] Firebase auth object:', auth);

    /**
     * Fallback timeout to prevent infinite loading
     */
    const fallbackTimeout = setTimeout(() => {
      if (mounted && !navigationComplete) {
        console.log('⚠️ [SplashScreen] Fallback timeout reached, navigating to sign-in');
        setAuthChecked(true);
        setIsChecking(false);
        navigationComplete = true;
        router.replace('/sign-in');
      }
    }, maxDisplayTime);

    /**
     * Additional safety timeout for auth state listener
     * If onAuthStateChanged doesn't fire within 3 seconds, check manually
     */
    const authListenerTimeout = setTimeout(() => {
      if (mounted && !navigationComplete) {
        console.log('⚠️ [SplashScreen] Auth listener timeout - checking current user manually');
        
        // Manual check of current user
        const currentUser = auth.currentUser;
        console.log('👤 [SplashScreen] Manual auth check - Current user:', currentUser);
        
        // Trigger the same logic as the auth state listener
        handleAuthStateChange(currentUser);
      }
    }, 3000);

    /**
     * Centralized auth state handling function
     */
    const handleAuthStateChange = async (user: any) => {
      if (!mounted || navigationComplete) return;
      
      try {
        console.log('🔍 [SplashScreen] Processing auth state:', user ? 'User found' : 'No user');
        
        // Calculate remaining time to meet minimum display duration
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        console.log(`⏱️ [SplashScreen] Elapsed: ${elapsedTime}ms, Remaining: ${remainingTime}ms`);
        
        // Wait for minimum display time if needed
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        if (!mounted || navigationComplete) return;
        
        // Mark authentication check as complete
        setAuthChecked(true);
        setIsChecking(false);
        navigationComplete = true;
        
        // Clear both timeouts
        clearTimeout(fallbackTimeout);
        clearTimeout(authListenerTimeout);
        
        /**
         * Navigation Logic Based on Authentication Status
         */
        if (user) {
          // Valid session exists - user is authenticated
          console.log('✅ [SplashScreen] Valid session found, navigating to main app');
          console.log('👤 [SplashScreen] User:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
          });
          
          // Navigate to main app
          router.replace('/(app)/(drawer)/(tabs)');
        } else {
          // No valid session - user needs to authenticate
          console.log('❌ [SplashScreen] No valid session, navigating to authentication');
          
          // Navigate to authentication screen
          router.replace('/sign-in');
        }
        
      } catch (error) {
        console.error('💥 [SplashScreen] Error during auth check:', error);
        
        // On error, assume no valid session and navigate to auth
        if (mounted && !navigationComplete) {
          setAuthChecked(true);
          setIsChecking(false);
          navigationComplete = true;
          clearTimeout(fallbackTimeout);
          clearTimeout(authListenerTimeout);
          router.replace('/sign-in');
        }
      }
    };
    
    /**
     * Firebase Auth State Listener
     * - Automatically checks stored token/session validity
     * - Returns user object if valid session exists
     * - Returns null if no valid session
     */
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('� [SplashScreen] onAuthStateChanged fired:', user ? 'User found' : 'No user');
      
      // Clear the manual check timeout since the listener fired
      clearTimeout(authListenerTimeout);
      
      // Use centralized handler
      await handleAuthStateChange(user);
    });

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      clearTimeout(authListenerTimeout);
      unsubscribe();
      console.log('🧹 [SplashScreen] Cleanup completed');
    };
  }, []);

  // ============================================================================
  // Render
  // ============================================================================
  
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: 'white' 
    }}>
      <Animated.View style={[contentAnimatedStyle, { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingHorizontal: 32 
      }]}>
        
        {/* Loading Indicator During Auth Check */}
        <View style={{ alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#666" />
          
          <Text style={{ 
            color: '#666', 
            fontSize: 14, 
            opacity: 0.7, 
            marginTop: 16,
            textAlign: 'center'
          }}>
            {isChecking ? 'Checking authentication...' : 'Redirecting...'}
          </Text>
        </View>

        {/* Debug Info (only in development) */}
        {__DEV__ && (
          <View style={{ 
            position: 'absolute', 
            bottom: 50, 
            backgroundColor: 'rgba(0,0,0,0.1)',
            padding: 12,
            borderRadius: 8,
          }}>
            <Text style={{ color: '#666', fontSize: 12 }}>
              Auth Status: {isChecking ? 'Checking...' : 'Complete'}
            </Text>
            <Text style={{ color: '#666', fontSize: 12 }}>
              Auth Checked: {authChecked ? 'Yes' : 'No'}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

export default SplashScreen;