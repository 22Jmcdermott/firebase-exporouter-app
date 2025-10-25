import CustomSplashScreen from '@/components/SplashScreen';

/**
 * Root Index Route
 * This is the initial route that users see when they first open the app.
 * The SplashScreen component will handle authentication checking and navigation.
 */
export default function Index() {
  return <CustomSplashScreen />;
}