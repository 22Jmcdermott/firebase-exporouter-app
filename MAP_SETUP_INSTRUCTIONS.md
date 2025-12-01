# Map Integration Setup Instructions

## Overview
The app now includes map integration for proximity guidance and navigation to hunt locations. This uses Google Maps API for Android.

## Prerequisites
1. **Google Maps API Key** - You need a Google Cloud Platform account and an API key with Maps SDK for Android enabled.

## Setup Steps

### 1. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable "Maps SDK for Android" API
4. Go to "Credentials" and create an API key
5. (Optional but recommended) Restrict the API key to your app's package name: `com.aks.appwrnlibapp`

### 2. Configure API Key in app.json
The API key configuration is already set up in `app.json`:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

**Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual API key.**

### 3. Install Required Packages
Run the following command to install dependencies:

```bash
npm install
```

Or if using yarn:
```bash
yarn install
```

### 4. Rebuild the Android App
After adding the API key and installing packages, you need to rebuild:

```bash
npx expo run:android
```

Or for EAS build:
```bash
eas build --profile preview --platform android
```

## Features Implemented

### 1. Proximity Guidance (HuntDetailPlayer.jsx)
- **Distance Display**: Shows distance to available locations
- **Direction Arrow**: Visual arrow pointing to target location
- **Compass Direction**: Text direction (N, NE, E, etc.)
- **Progressive Disclosure**: Detailed guidance only shows within 500 meters
- **View Map Button**: Opens full map view for navigation

### 2. Map View Modal
- **User Location**: Blue marker showing current position
- **Target Location**: Red marker for destination
- **Check-in Range Circle**: Visual indicator of check-in proximity (11 meters)
- **Distance & Direction Overlay**: Real-time guidance information

### 3. Location Editor Map Preview (location-detail.jsx)
- **Visual Confirmation**: Shows map preview when creating/editing locations
- **Coordinate Validation**: Helps verify GPS coordinates are correct

## Permissions

The app requests the following location permissions:
- `ACCESS_FINE_LOCATION` - For precise GPS coordinates
- `ACCESS_COARSE_LOCATION` - For approximate location

These are already configured in `app.json`.

## Testing Checklist

- [ ] Add valid Google Maps API key to app.json
- [ ] Install dependencies (`npm install`)
- [ ] Rebuild app (`npx expo run:android`)
- [ ] Test location permissions prompt
- [ ] Verify map displays in HuntDetailPlayer
- [ ] Test proximity guidance calculations
- [ ] Verify map modal opens and shows markers
- [ ] Test location preview in location editor
- [ ] Verify check-in works when within range

## Troubleshooting

### Map shows blank/gray screen
- Verify API key is correct in app.json
- Check that Maps SDK for Android is enabled in Google Cloud Console
- Rebuild the app after adding API key

### Location permissions not working
- Check Android device settings for location services
- Verify permissions are declared in app.json
- Try uninstalling and reinstalling the app

### Distance calculations seem wrong
- Ensure GPS coordinates use decimal format (not DMS)
- Check that latitude is -90 to 90 and longitude is -180 to 180
- Make sure device location services are enabled

## API Usage Notes

**Cost Consideration**: Google Maps API has a free tier, but monitor your usage to avoid unexpected charges. The app uses:
- Maps SDK for Android (charged per map load)
- No route calculations or geocoding (to minimize costs)

## Security Best Practices

1. **Restrict API Key**: In Google Cloud Console, restrict your API key to:
   - Android apps with your package name
   - Maps SDK for Android only

2. **Environment Variables**: For production, consider using environment variables for API keys instead of hardcoding in app.json

3. **Monitor Usage**: Set up billing alerts in Google Cloud Console to monitor API usage
