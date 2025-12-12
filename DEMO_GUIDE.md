# Scavenger Hunt App - Demo & Code Walkthrough

## Overview
A location-based scavenger hunt mobile app built with React Native and Firebase. Users can create, discover, and play real-world treasure hunts using GPS tracking.

---

## Table of Contents
1. [Demo Flow](#demo-flow)
2. [Architecture](#architecture)
3. [Key Features & Code](#key-features--code)
4. [Technical Challenges](#technical-challenges)
5. [Database Schema](#database-schema)

---

## Demo Flow

### 1. Opening (Show the App Running)
**What to show**: Launch app → Browse hunts → Join one → Check in at location → Complete

**Talking points**:
- "This is a location-based scavenger hunt app"
- "Users can create custom hunts with GPS checkpoints"
- "Real-time distance tracking guides players to locations"

---

## Architecture

```
React Native (Expo SDK 54)
├── Firebase Authentication (user management)
├── Firestore (real-time database)
├── Expo Location API (GPS tracking)
├── Expo Router (file-based navigation)
└── NativeWind (Tailwind CSS for styling)
```

**File Structure**:
```
app/
├── (app)/
│   ├── (drawer)/
│   │   └── (tabs)/
│   │       ├── explore.jsx          # Browse hunts
│   │       ├── hunts.jsx            # User's hunts
│   │       └── messages.jsx         # Chat
├── HuntDiscovery.jsx                # Public hunts with ratings
├── HuntDetailPlayer.jsx             # Play a hunt (GPS tracking)
├── hunt-detail.tsx                  # Edit/manage hunt
├── location-detail.jsx              # Edit location details
└── ReviewForm.jsx                   # Submit reviews

lib/
├── database-service.ts              # Firebase CRUD operations
└── firebaseConfig.js                # Firebase initialization
```

---

## Key Features & Code

### Feature 1: GPS Distance Calculation (Haversine Formula)

**Demo**: Show real-time distance updating as you move

**File**: `app/HuntDetailPlayer.jsx`

```javascript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};
```

**Explanation**:
- Calculates great-circle distance between two GPS coordinates
- Accounts for Earth's curvature (not just straight-line distance)
- Returns distance in meters for accuracy

**Usage**:
```javascript
const distance = calculateDistance(
  userLocation.latitude,
  userLocation.longitude,
  location.latitude,
  location.longitude
);

// Show formatted distance
const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};
```

---

### Feature 2: Proximity Check-in Validation

**Demo**: Try to check in from far away (blocked), then from within 50 meters (allowed)

**File**: `app/HuntDetailPlayer.jsx`

```javascript
const isUserNearLocation = (location) => {
  if (!userLocation) return false;

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    location.latitude,
    location.longitude
  );

  // Check if user is within 50 meters of the location
  return distance <= 50;
};

const handleCheckIn = async (location) => {
  if (!isUserNearLocation(location)) {
    Alert.alert('Too Far', 'You are not close enough to the location.');
    return;
  }

  try {
    setCheckingInLocationId(location.locationId);
    await createCheckIn(user.uid, huntId, location.locationId);
    
    Alert.alert('Success!', 'Location checked in successfully!');
    await loadCheckIns();
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setCheckingInLocationId(null);
  }
};
```

**Design Decision**: 
- Originally used 11-meter precision (4 decimal places)
- Changed to 50-meter radius for better outdoor UX
- Prevents "GPS drift" false negatives

---

### Feature 3: Real-time GPS Tracking

**Demo**: Show location updating live, distance changing, directional arrow

**File**: `app/HuntDetailPlayer.jsx`

```javascript
useEffect(() => {
  let locationSubscription;

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  startLocationTracking();

  return () => {
    if (locationSubscription) {
      locationSubscription.remove();
    }
  };
}, []);
```

**Proximity Guidance UI**:
```javascript
const getProximityGuidance = (location) => {
  if (!userLocation) return null;
  
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    location.latitude,
    location.longitude
  );

  const bearing = calculateBearing(
    userLocation.latitude,
    userLocation.longitude,
    location.latitude,
    location.longitude
  );

  const direction = getDirectionText(bearing); // "North", "Northeast", etc.
  const arrow = getDirectionArrow(bearing);    // "⬆️", "↗️", etc.

  return {
    distance,
    direction,
    arrow,
    formattedDistance: formatDistance(distance)
  };
};
```

---

### Feature 4: Location Conditions System

**Demo**: Show time-restricted location, sequential unlocking

**File**: `app/HuntDetailPlayer.jsx`

```javascript
const isLocationAvailable = (location) => {
  const conditions = locationConditions[location.locationId] || [];
  
  // Check dependencies (sequential unlocking)
  if (location.dependsOn) {
    const dependencyCompleted = checkIns.some(
      ci => ci.locationId === location.dependsOn
    );
    if (!dependencyCompleted) return false;
  }

  // Check time window conditions
  for (const condition of conditions) {
    if (condition.type === 'TIME_WINDOW') {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (currentTime < condition.startTime || currentTime > condition.endTime) {
        return false;
      }
    }
  }

  return true;
};
```

**Condition Types**:
1. **TIME_WINDOW**: Only accessible during specific hours
2. **SEQUENCE**: Must complete previous locations first
3. *Future*: Weather conditions, day of week

---

### Feature 5: Hunt Discovery with Ratings

**Demo**: Browse public hunts, show ratings, open reviews

**File**: `app/HuntDiscovery.jsx`

```javascript
useEffect(() => {
  const loadHunts = async () => {
    try {
      const huntsQuery = query(
        collection(db, 'hunts'),
        where('isVisible', '==', true),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(huntsQuery);
      const huntsData = [];

      for (const docSnap of querySnapshot.docs) {
        const hunt = { id: docSnap.id, ...docSnap.data() };
        
        // Get rating statistics
        try {
          const stats = await getHuntRatingStats(hunt.id);
          hunt.averageRating = stats.averageRating;
          hunt.reviewCount = stats.count;
        } catch (error) {
          console.error(`Error loading ratings for hunt ${hunt.id}:`, error);
        }

        huntsData.push(hunt);
      }

      setHunts(huntsData);
    } catch (error) {
      console.error('Error loading hunts:', error);
    }
  };

  loadHunts();
}, []);
```

**Rating Statistics Function** (`lib/database-service.ts`):
```typescript
export const getHuntRatingStats = async (huntId: string) => {
  const reviewsQuery = query(
    collection(db, 'reviews'),
    where('huntId', '==', huntId)
  );

  const snapshot = await getDocs(reviewsQuery);
  
  if (snapshot.empty) {
    return { averageRating: 0, count: 0 };
  }

  let totalRating = 0;
  snapshot.forEach(doc => {
    totalRating += doc.data().rating;
  });

  return {
    averageRating: totalRating / snapshot.size,
    count: snapshot.size
  };
};
```

**Display**:
```jsx
{hunt.averageRating > 0 && (
  <View className="flex-row items-center mt-2">
    <Text className="text-yellow-500 text-lg">★</Text>
    <Text className="text-gray-700 ml-1">
      {hunt.averageRating.toFixed(1)} ({hunt.reviewCount} reviews)
    </Text>
  </View>
)}
```

---

### Feature 6: Review System

**Demo**: Complete a hunt → Submit review with 5-star rating

**File**: `app/ReviewForm.jsx`

```javascript
const submitReview = async () => {
  if (!huntId || !user) return;

  try {
    setSubmitting(true);

    // Check if review exists
    const existingReview = await getReviewByUserAndHunt(user.uid, huntId);

    if (existingReview) {
      // Update existing review
      await updateReview(existingReview.id, {
        rating: selectedRating,
        comment: comment.trim(),
        timestamp: new Date()
      });
      Alert.alert('Success', 'Your review has been updated!');
    } else {
      // Create new review
      await createReview({
        huntId,
        userId: user.uid,
        rating: selectedRating,
        comment: comment.trim(),
        timestamp: new Date()
      });
      Alert.alert('Success', 'Your review has been submitted!');
    }

    router.back();
  } catch (error) {
    Alert.alert('Error', 'Failed to submit review. Please try again.');
  } finally {
    setSubmitting(false);
  }
};
```

**Star Rating UI**:
```jsx
<View className="flex-row justify-center my-6">
  {[1, 2, 3, 4, 5].map((star) => (
    <Pressable
      key={star}
      onPress={() => setSelectedRating(star)}
      className="mx-1"
    >
      <Text className="text-5xl">
        {star <= selectedRating ? '⭐' : '☆'}
      </Text>
    </Pressable>
  ))}
</View>
```

---

### Feature 7: Messaging System

**Demo**: Send message to another user, see real-time delivery

**File**: `app/Messages.jsx`

```javascript
// Load conversations for current user
useEffect(() => {
  if (!user?.uid) return;

  const conversationsQuery = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', user.uid),
    orderBy('lastMessageTime', 'desc')
  );

  const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
    const conversationsData = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const otherUserId = data.participants.find(p => p !== user.uid);
      
      // Get other user's profile
      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      const otherUser = userDoc.exists() ? userDoc.data() : null;

      conversationsData.push({
        id: doc.id,
        ...data,
        otherUser
      });
    }

    setConversations(conversationsData);
  });

  return () => unsubscribe();
}, [user]);
```

**Send Message** (`app/Chat.jsx`):
```javascript
const sendMessage = async () => {
  if (!messageText.trim() || !conversationId || !user) return;

  try {
    await addDoc(collection(db, 'messages'), {
      conversationId,
      senderId: user.uid,
      text: messageText.trim(),
      timestamp: new Date(),
      read: false
    });

    // Update conversation's last message time
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessageTime: new Date(),
      lastMessage: messageText.trim()
    });

    setMessageText('');
  } catch (error) {
    console.error('Error sending message:', error);
  }
};
```

---

### Feature 8: Hunt Visibility Toggle

**Demo**: Toggle hunt between public/private, show it appear/disappear in Discovery

**File**: `app/hunt-detail.tsx`

```typescript
const handleToggleVisibility = async () => {
  if (!hunt || !user || !huntId || typeof huntId !== 'string') return;

  setIsTogglingVisibility(true);
  try {
    const newVisibility = !hunt.isVisible;
    await updateHuntVisibility(huntId, newVisibility, user.uid);
    setHunt({ ...hunt, isVisible: newVisibility });
    
    Alert.alert(
      'Success',
      `Hunt is now ${newVisibility ? 'Public' : 'Private'}`,
      [{ text: 'OK' }]
    );
  } catch (error: any) {
    Alert.alert('Error', `Failed to update visibility: ${error?.message || 'Please try again.'}`);
  } finally {
    setIsTogglingVisibility(false);
  }
};
```

**Database Function** (`lib/database-service.ts`):
```typescript
export const updateHuntVisibility = async (
  huntId: string, 
  isVisible: boolean, 
  userId: string
): Promise<void> => {
  const huntRef = doc(db, 'hunts', huntId);
  const huntDoc = await getDoc(huntRef);

  if (!huntDoc.exists()) {
    throw new Error('Hunt not found');
  }

  if (huntDoc.data().creatorId !== userId) {
    throw new Error('You do not have permission to modify this hunt');
  }

  await updateDoc(huntRef, { isVisible });
};
```

---

## Technical Challenges

### Challenge 1: Firestore Composite Indexes

**Problem**: Complex queries require specific indexes

**Example Query**:
```javascript
// This requires a composite index: huntId + timestamp
const reviewsQuery = query(
  collection(db, 'reviews'),
  where('huntId', '==', huntId),
  orderBy('timestamp', 'desc')
);
```

**Solution**: Created indexes via Firebase Console
- `reviews`: huntId (Ascending) + timestamp (Descending)
- `checkIns`: huntId (Ascending) + userId (Ascending) + timestamp (Ascending)
- `conversations`: participants (Array) + lastMessageTime (Descending)

**Why needed**: 
- Can't order by field while filtering without index
- Array-contains queries with orderBy require indexes

---

### Challenge 2: GPS Accuracy

**Problem**: GPS has ~10-30m accuracy, causes false negatives

**Original Code**:
```javascript
// Too strict - required 11m precision
const latMatch = Math.abs(userLocation.latitude - location.latitude) < 0.0001;
const lonMatch = Math.abs(userLocation.longitude - location.longitude) < 0.0001;
return latMatch && lonMatch;
```

**Improved Code**:
```javascript
// Uses actual distance calculation with 50m radius
const distance = calculateDistance(
  userLocation.latitude,
  userLocation.longitude,
  location.latitude,
  location.longitude
);
return distance <= 50;
```

**Impact**: Much better user experience outdoors

---

### Challenge 3: Real-time Updates

**Problem**: Multiple users need to see updates instantly

**Solution**: Firestore real-time listeners

```javascript
useEffect(() => {
  if (!huntId) return;

  // Subscribe to real-time updates
  const locationsQuery = query(
    collection(db, 'locations'),
    where('huntId', '==', huntId),
    orderBy('order', 'asc')
  );

  const unsubscribe = onSnapshot(locationsQuery, (snapshot) => {
    const locationsList = snapshot.docs.map(doc => ({
      locationId: doc.id,
      ...doc.data()
    }));
    setLocations(locationsList);
  });

  // Cleanup subscription on unmount
  return () => unsubscribe();
}, [huntId]);
```

**Benefits**:
- Instant updates when hunt creator edits
- No polling required
- Automatic cleanup prevents memory leaks

---

### Challenge 4: Firebase Security Rules

**Problem**: Need to prevent unauthorized access

**Rules** (Firestore):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Hunts: anyone can read public, only creator can edit
    match /hunts/{huntId} {
      allow read: if resource.data.isVisible == true || 
                     resource.data.creatorId == request.auth.uid;
      allow create: if request.auth != null;
      allow update, delete: if resource.data.creatorId == request.auth.uid;
    }

    // Check-ins: users can only create their own
    match /checkIns/{checkInId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == request.resource.data.userId;
      allow delete: if request.auth.uid == resource.data.userId;
    }

    // Reviews: users can create/edit their own
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## Database Schema

### Collections

#### `hunts`
```javascript
{
  id: "auto-generated",
  name: "Downtown Adventure",
  description: "Explore the city center",
  creatorId: "user123",
  isVisible: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `locations`
```javascript
{
  id: "auto-generated",
  huntId: "hunt123",
  latitude: 39.9982781,
  longitude: -81.7345691,
  name: "City Hall",
  clueText: "Where laws are made",
  order: 1,
  dependsOn: null, // or locationId for sequential
  createdAt: Timestamp
}
```

#### `checkIns`
```javascript
{
  id: "auto-generated",
  userId: "user123",
  huntId: "hunt123",
  locationId: "loc123",
  timestamp: Timestamp
}
```

**Index**: huntId + userId + timestamp (for progress tracking)

#### `reviews`
```javascript
{
  id: "auto-generated",
  huntId: "hunt123",
  userId: "user123",
  rating: 5,
  comment: "Great hunt!",
  timestamp: Timestamp
}
```

**Index**: huntId + timestamp (for sorted reviews)

#### `conversations`
```javascript
{
  id: "auto-generated",
  participants: ["user123", "user456"],
  lastMessage: "Hey, want to team up?",
  lastMessageTime: Timestamp,
  createdAt: Timestamp
}
```

**Index**: participants (array-contains) + lastMessageTime

#### `messages`
```javascript
{
  id: "auto-generated",
  conversationId: "conv123",
  senderId: "user123",
  text: "Let's meet at location 1",
  timestamp: Timestamp,
  read: false
}
```

#### `conditions`
```javascript
{
  id: "auto-generated",
  locationId: "loc123",
  type: "TIME_WINDOW", // or "WEATHER", "SEQUENCE"
  startTime: "09:00",
  endTime: "17:00",
  createdAt: Timestamp
}
```

---

## Key Dependencies

```json
{
  "expo": "~54.0.0",
  "react-native": "0.81.5",
  "firebase": "^12.3.0",
  "expo-location": "~18.0.8",
  "expo-router": "~6.0.12",
  "nativewind": "^4.1.23"
}
```

---

## Performance Optimizations

1. **Lazy Loading**: Only load locations when hunt is opened
2. **Indexed Queries**: All complex queries have Firestore indexes
3. **Subscription Cleanup**: All useEffect hooks return cleanup functions
4. **Memoization**: Distance calculations only run when coords change
5. **Debouncing**: Location updates throttled to prevent excessive renders

---

## Demo Script Summary

### 1. Opening (30 seconds)
- Launch app on phone
- Show Hunt Discovery with ratings
- "This is a GPS-based scavenger hunt app"

### 2. Playing a Hunt (3 minutes)
- Open active hunt
- Show real-time distance: "32m away ⬆️ North"
- Walk closer, distance updates
- Check in when within 50m
- Explain Haversine formula

### 3. Creating a Hunt (2 minutes)
- Create new hunt
- Add location by tapping map
- Set time window condition
- Toggle visibility public/private

### 4. Social Features (2 minutes)
- Show completed hunt with reviews
- Submit 5-star review
- Open messages, send message

### 5. Code Deep Dive (5 minutes)
- Show `calculateDistance` function
- Explain Firestore composite indexes
- Show real-time listener setup
- Discuss security rules

### 6. Closing (1 minute)
- Summarize: GPS tracking, real-time updates, social features
- Technologies: React Native, Firebase, Expo
- Future: Push notifications, teams, photo uploads

---

## Questions to Anticipate

**Q: Why React Native over native iOS/Android?**
A: Cross-platform development, faster iteration with hot reload, large ecosystem, Expo simplifies deployment.

**Q: Why Firebase?**
A: Real-time database with listeners, free tier, built-in authentication, no server management, great for MVPs.

**Q: How accurate is GPS tracking?**
A: Consumer GPS is ~10-30m accurate. We use 50m radius to account for drift. Could use geofencing for tighter precision.

**Q: What about battery drain?**
A: Currently using foreground location only (when app open). Could optimize with background geofencing or lower update frequency.

**Q: How do you handle offline mode?**
A: Currently requires internet. Could add Firestore offline persistence and local queue for check-ins.

**Q: Scalability concerns?**
A: Firestore scales well. Would need to optimize query costs with caching. Could move to Cloud Functions for complex operations.

**Q: Security of location data?**
A: Firestore rules prevent unauthorized access. Only share location when actively playing. Could add privacy settings.

---

## Next Steps / Future Enhancements

1. **Push Notifications**: Notify when friend completes your hunt
2. **Team Hunts**: Multiple users collaborate on same hunt
3. **Photo Challenges**: Require photo at location for check-in
4. **Leaderboards**: Fastest completion times
5. **Hunt Templates**: Reuse location sets for different hunts
6. **AR Features**: Point camera at location for hints
7. **Offline Mode**: Cache hunts for areas without signal
8. **Analytics**: Track popular hunts, completion rates
9. **Monetization**: Premium hunts, custom themes
10. **Social Sharing**: Share completed hunts to social media

---

## Resources

- **GitHub**: https://github.com/22Jmcdermott/Mobile-apps-first-project
- **Firebase Console**: https://console.firebase.google.com/project/fir-app-f0a08
- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/

---

*Last updated: December 10, 2025*
