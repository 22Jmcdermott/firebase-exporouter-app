import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import app from './firebase-config';

const db = getFirestore(app);

export const convertLocalTimeToUTC = (localTimeString: string): string => {
  const [hours, minutes] = localTimeString.split(':').map(Number);
  const localDate = new Date();
  localDate.setHours(hours, minutes, 0, 0);
  const utcHours = localDate.getUTCHours();
  const utcMinutes = localDate.getUTCMinutes();
  return `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:00`;
};

export const convertUTCTimeToLocal = (utcTimeString: string): string => {
  const [hours, minutes] = utcTimeString.split(':').map(Number);
  const utcDate = new Date();
  utcDate.setUTCHours(hours, minutes, 0, 0);
  const localHours = utcDate.getHours();
  const localMinutes = utcDate.getMinutes();
  return `${localHours.toString().padStart(2, '0')}:${localMinutes.toString().padStart(2, '0')}`;
};

export const getCurrentLocalTime = (): string => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export interface Hunt {
  id?: string;
  name: string;
  userId: string;
  createdAt: any;
  isVisible: boolean;
}

export interface Location {
  locationId?: string;
  huntId: string;
  locationName: string;
  explanation: string;
  latitude: number;
  longitude: number;
}

export interface Condition {
  conditionId?: string;
  locationId: string;
  type: 'REQUIRED_LOCATION' | 'TIME_WINDOW';
  requiredLocationId?: string;
  startTime?: string;
  endTime?: string;
}

export interface PlayerHunt {
  playerHuntId?: string;
  userId: string;
  huntId: string;
  status: 'STARTED' | 'NOT_STARTED' | 'COMPLETED' | 'ABANDONED';
  startTime?: any;
  completionTime?: any;
}

export interface CheckIn {
  checkInId?: string;
  userId: string;
  huntId: string;
  locationId: string;
  timestamp: any;
}

export const createHunt = async (huntName: string, userId: string): Promise<string> => {
  const docRef = await addDoc(collection(db, 'hunts'), {
    name: huntName,
    userId: userId,
    createdAt: serverTimestamp(),
    isVisible: false
  });
  return docRef.id;
};

export const getUserHunts = async (userId: string): Promise<Hunt[]> => {
  const q = query(
    collection(db, 'hunts'),
    where('userId', '==', userId)
  );
  
  const querySnapshot = await getDocs(q);
  const hunts: Hunt[] = [];

  querySnapshot.forEach((doc) => {
    const huntData = doc.data();
    hunts.push({
      id: doc.id,
      name: huntData.name,
      userId: huntData.userId,
      createdAt: huntData.createdAt,
      isVisible: huntData.isVisible
    });
  });

  return hunts;
};

/**
 * Get all visible hunts for discovery
 * @returns {Promise<Hunt[]>}
 */
export const getVisibleHunts = async (): Promise<Hunt[]> => {
  const q = query(
    collection(db, 'hunts'),
    where('isVisible', '==', true)
  );
  
  const querySnapshot = await getDocs(q);
  const hunts: Hunt[] = [];

  querySnapshot.forEach((doc) => {
    const huntData = doc.data();
    hunts.push({
      id: doc.id,
      name: huntData.name,
      userId: huntData.userId,
      createdAt: huntData.createdAt,
      isVisible: huntData.isVisible
    });
  });

  // Sort by createdAt in JavaScript instead
  hunts.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime; // Newest first
  });

  return hunts;
};

export const huntExistsForUser = async (huntName: string, userId: string): Promise<boolean> => {
  const q = query(
    collection(db, 'hunts'),
    where('userId', '==', userId),
    where('name', '==', huntName)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

export const getHuntById = async (huntId: string): Promise<Hunt | null> => {
  const docRef = doc(db, 'hunts', huntId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const huntData = docSnap.data();
    return {
      id: docSnap.id,
      name: huntData.name,
      userId: huntData.userId,
      createdAt: huntData.createdAt,
      isVisible: huntData.isVisible
    } as Hunt;
  }
  return null;
};

/**
 * Update a hunt's name
 * @param {string} huntId - ID of the hunt to update
 * @param {string} newName - New name for the hunt
 * @param {string} userId - ID of the user (for validation)
 * @returns {Promise<void>}
 */
export const updateHuntName = async (huntId: string, newName: string, userId: string): Promise<void> => {
  try {
    // First verify the hunt belongs to the user
    const hunt = await getHuntById(huntId);
    if (!hunt) {
      throw new Error('Hunt not found');
    }
    
    if (hunt.userId !== userId) {
      throw new Error('Unauthorized: Hunt does not belong to this user');
    }

    // Update the hunt name
    const docRef = doc(db, 'hunts', huntId);
    await updateDoc(docRef, {
      name: newName
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Update hunt visibility (public/private)
 * @param {string} huntId - ID of the hunt to update
 * @param {boolean} isVisible - Whether hunt should be publicly visible
 * @param {string} userId - ID of the user (for validation)
 * @returns {Promise<void>}
 */
export const updateHuntVisibility = async (huntId: string, isVisible: boolean, userId: string): Promise<void> => {
  try {
    // First verify the hunt belongs to the user
    const hunt = await getHuntById(huntId);
    if (!hunt) {
      throw new Error('Hunt not found');
    }
    
    if (hunt.userId !== userId) {
      throw new Error('Unauthorized: Hunt does not belong to this user');
    }

    // Update the hunt visibility
    const docRef = doc(db, 'hunts', huntId);
    await updateDoc(docRef, {
      isVisible: isVisible
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get all publicly visible hunts (for discovery)
 * @returns {Promise<Hunt[]>} - Array of public hunts
 */
export const getPublicHunts = async (): Promise<Hunt[]> => {
  try {
    const q = query(
      collection(db, 'hunts'),
      where('isVisible', '==', true),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const hunts: Hunt[] = [];

    querySnapshot.forEach((doc) => {
      const huntData = doc.data();
      hunts.push({
        id: doc.id,
        name: huntData.name,
        userId: huntData.userId,
        createdAt: huntData.createdAt,
        isVisible: huntData.isVisible
      });
    });

    return hunts;
  } catch (error: any) {
    throw error;
  }
};



// ========================================
// LOCATIONS COLLECTION FUNCTIONS
// ========================================

/**
 * Create a new location for a hunt
 * @param {Omit<Location, 'locationId'>} locationData - Location data without ID
 * @returns {Promise<string>} - ID of the created location
 */
export const createLocation = async (locationData: Omit<Location, 'locationId'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'locations'), {
      huntId: locationData.huntId,
      locationName: locationData.locationName,
      explanation: locationData.explanation,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get all locations for a specific hunt
 * @param {string} huntId - ID of the hunt
 * @returns {Promise<Location[]>} - Array of locations for the hunt
 */
export const getHuntLocations = async (huntId: string): Promise<Location[]> => {
  try {
    const q = query(
      collection(db, 'locations'),
      where('huntId', '==', huntId)
    );

    const querySnapshot = await getDocs(q);
    const locations: Location[] = [];

    querySnapshot.forEach((doc) => {
      const locationData = doc.data();
      locations.push({
        locationId: doc.id,
        huntId: locationData.huntId,
        locationName: locationData.locationName,
        explanation: locationData.explanation,
        latitude: locationData.latitude,
        longitude: locationData.longitude
      });
    });

    return locations;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get a specific location by ID
 * @param {string} locationId - ID of the location
 * @returns {Promise<Location | null>} - Location object or null if not found
 */
export const getLocationById = async (locationId: string): Promise<Location | null> => {
  try {
    const docRef = doc(db, 'locations', locationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const locationData = docSnap.data();
      return {
        locationId: docSnap.id,
        huntId: locationData.huntId,
        locationName: locationData.locationName,
        explanation: locationData.explanation,
        latitude: locationData.latitude,
        longitude: locationData.longitude
      } as Location;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Update a location's information
 * @param {string} locationId - ID of the location to update
 * @param {Partial<Omit<Location, 'locationId' | 'huntId'>>} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateLocation = async (
  locationId: string, 
  updates: Partial<Omit<Location, 'locationId' | 'huntId'>>
): Promise<void> => {
  try {
    const docRef = doc(db, 'locations', locationId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Delete a location
 * @param {string} locationId - ID of the location to delete
 * @returns {Promise<void>}
 */
export const deleteLocation = async (locationId: string): Promise<void> => {
  try {
    // First delete all associated conditions
    const deletedConditionsCount = await deleteAllLocationConditions(locationId);

    // Then delete the location document
    const locationRef = doc(db, "locations", locationId);
    await deleteDoc(locationRef);
  } catch (error: any) {
    throw error;
  }
};

/**
 * Delete all locations for a specific hunt (useful when deleting a hunt)
 * @param {string} huntId - ID of the hunt
 * @returns {Promise<number>} - Number of locations deleted
 */
export const deleteAllHuntLocations = async (huntId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, 'locations'),
      where('huntId', '==', huntId)
    );

    const querySnapshot = await getDocs(q);
    const deletePromises: Promise<void>[] = [];

    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(doc(db, 'locations', docSnapshot.id)));
    });

    await Promise.all(deletePromises);
    
    return querySnapshot.size;
  } catch (error: any) {
    throw error;
  }
};

// ========================================
// CONDITIONS COLLECTION FUNCTIONS
// ========================================

/**
 * Create a new condition for a location
 * @param {Omit<Condition, 'conditionId'>} conditionData - Condition data without ID
 * @returns {Promise<string>} - ID of the created condition
 */
export const createCondition = async (conditionData: Omit<Condition, 'conditionId'>): Promise<string> => {
  try {
    // Convert local time inputs to UTC before saving to database
    let utcStartTime = conditionData.startTime;
    let utcEndTime = conditionData.endTime;
    
    if (conditionData.type === 'TIME_WINDOW') {
      if (conditionData.startTime) {
        utcStartTime = convertLocalTimeToUTC(conditionData.startTime);
      }
      if (conditionData.endTime) {
        utcEndTime = convertLocalTimeToUTC(conditionData.endTime);
      }
    }
    
    const docRef = await addDoc(collection(db, 'conditions'), {
      locationId: conditionData.locationId,
      type: conditionData.type,
      requiredLocationId: conditionData.requiredLocationId,
      startTime: utcStartTime, // Store UTC time in database
      endTime: utcEndTime, // Store UTC time in database
      createdAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get all conditions for a specific location
 * @param {string} locationId - ID of the location
 * @returns {Promise<Condition[]>} - Array of conditions for the location
 */
export const getLocationConditions = async (locationId: string): Promise<Condition[]> => {
  try {
    const q = query(
      collection(db, 'conditions'),
      where('locationId', '==', locationId)
    );

    const querySnapshot = await getDocs(q);
    const conditions: Condition[] = [];

    querySnapshot.forEach((doc) => {
      const conditionData = doc.data();
      
      // Convert UTC times back to local times for display
      let localStartTime = conditionData.startTime;
      let localEndTime = conditionData.endTime;
      
      if (conditionData.type === 'TIME_WINDOW') {
        if (conditionData.startTime) {
          localStartTime = convertUTCTimeToLocal(conditionData.startTime);
        }
        if (conditionData.endTime) {
          localEndTime = convertUTCTimeToLocal(conditionData.endTime);
        }
      }
      
      conditions.push({
        conditionId: doc.id,
        locationId: conditionData.locationId,
        type: conditionData.type,
        requiredLocationId: conditionData.requiredLocationId,
        startTime: localStartTime, // Return local time for display
        endTime: localEndTime // Return local time for display
      });
    });

    return conditions;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get a specific condition by ID
 * @param {string} conditionId - ID of the condition
 * @returns {Promise<Condition | null>} - Condition object or null if not found
 */
export const getConditionById = async (conditionId: string): Promise<Condition | null> => {
  try {
    const docRef = doc(db, 'conditions', conditionId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const conditionData = docSnap.data();
      
      // Convert UTC times back to local times for display
      let localStartTime = conditionData.startTime;
      let localEndTime = conditionData.endTime;
      
      if (conditionData.type === 'TIME_WINDOW') {
        if (conditionData.startTime) {
          localStartTime = convertUTCTimeToLocal(conditionData.startTime);
        }
        if (conditionData.endTime) {
          localEndTime = convertUTCTimeToLocal(conditionData.endTime);
        }
      }
      
      return {
        conditionId: docSnap.id,
        locationId: conditionData.locationId,
        type: conditionData.type,
        requiredLocationId: conditionData.requiredLocationId,
        startTime: localStartTime, // Return local time for display
        endTime: localEndTime // Return local time for display
      } as Condition;
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Update a condition's information
 * @param {string} conditionId - ID of the condition to update
 * @param {Partial<Omit<Condition, 'conditionId' | 'locationId'>>} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateCondition = async (
  conditionId: string, 
  updates: Partial<Omit<Condition, 'conditionId' | 'locationId'>>
): Promise<void> => {
  try {
    // Convert local time inputs to UTC before saving to database
    const utcUpdates = { ...updates };
    
    if (updates.type === 'TIME_WINDOW' || (!updates.type && (updates.startTime || updates.endTime))) {
      if (updates.startTime) {
        utcUpdates.startTime = convertLocalTimeToUTC(updates.startTime);
      }
      if (updates.endTime) {
        utcUpdates.endTime = convertLocalTimeToUTC(updates.endTime);
      }
    }
    
    const docRef = doc(db, 'conditions', conditionId);
    await updateDoc(docRef, {
      ...utcUpdates,
      updatedAt: serverTimestamp()
    });
  } catch (error: any) {
    throw error;
  }
};

/**
 * Delete a condition
 * @param {string} conditionId - ID of the condition to delete
 * @returns {Promise<void>}
 */
export const deleteCondition = async (conditionId: string): Promise<void> => {
  try {
    const conditionRef = doc(db, "conditions", conditionId);
    await deleteDoc(conditionRef);
  } catch (error: any) {
    throw error;
  }
};

/**
 * Delete all conditions for a specific location (useful when deleting a location)
 * @param {string} locationId - ID of the location
 * @returns {Promise<number>} - Number of conditions deleted
 */
export const deleteAllLocationConditions = async (locationId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, 'conditions'),
      where('locationId', '==', locationId)
    );

    const querySnapshot = await getDocs(q);
    const deletePromises: Promise<void>[] = [];

    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(doc(db, 'conditions', docSnapshot.id)));
    });

    await Promise.all(deletePromises);
    
    return querySnapshot.size;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Delete a hunt
 * @param {string} huntId - ID of the hunt to delete
 * @param {string} userId - ID of the user (for validation)
 * @returns {Promise<void>}
 */
export const deleteHunt = async (huntId: string, userId: string): Promise<void> => {
  try {
    // First verify the hunt belongs to the user
    const hunt = await getHuntById(huntId);
    if (!hunt) {
      throw new Error('Hunt not found');
    }
    
    if (hunt.userId !== userId) {
      throw new Error('Unauthorized: Hunt does not belong to this user');
    }

    // First delete all associated locations
    const deletedLocationsCount = await deleteAllHuntLocations(huntId);

    // Then delete the hunt document
    const huntRef = doc(db, "hunts", huntId);
    await deleteDoc(huntRef);
  } catch (error: any) {
    throw error;
  }
};

// ============================================================================
// PlayerHunts Collection Functions
// ============================================================================

/**
 * Start a hunt for a player
 * @param {string} userId - ID of the user starting the hunt
 * @param {string} huntId - ID of the hunt to start
 * @returns {Promise<string>} - ID of the created playerHunt document
 */
export const startPlayerHunt = async (userId: string, huntId: string): Promise<string> => {
  try {
    // Check if player already has this hunt started
    const existingHunt = await getPlayerHunt(userId, huntId);
    if (existingHunt) {
      throw new Error('Hunt already started by this player');
    }

    const docRef = await addDoc(collection(db, 'playerHunts'), {
      userId: userId,
      huntId: huntId,
      status: 'STARTED',
      startTime: serverTimestamp(),
      completionTime: null
    });
    return docRef.id;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get a specific player hunt
 * @param {string} userId - ID of the user
 * @param {string} huntId - ID of the hunt
 * @returns {Promise<PlayerHunt | null>}
 */
export const getPlayerHunt = async (userId: string, huntId: string): Promise<PlayerHunt | null> => {
  try {
    const q = query(
      collection(db, 'playerHunts'),
      where('userId', '==', userId),
      where('huntId', '==', huntId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      playerHuntId: doc.id,
      ...doc.data()
    } as PlayerHunt;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get all hunts for a specific player
 * @param {string} userId - ID of the user
 * @returns {Promise<PlayerHunt[]>}
 */
export const getPlayerHunts = async (userId: string): Promise<PlayerHunt[]> => {
  try {
    const q = query(
      collection(db, 'playerHunts'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    const playerHunts = querySnapshot.docs.map(doc => ({
      playerHuntId: doc.id,
      ...doc.data()
    })) as PlayerHunt[];

    // Sort by startTime in JavaScript instead
    playerHunts.sort((a, b) => {
      const aTime = a.startTime?.seconds || 0;
      const bTime = b.startTime?.seconds || 0;
      return bTime - aTime; // Newest first
    });

    return playerHunts;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Update player hunt status
 * @param {string} playerHuntId - ID of the player hunt
 * @param {string} status - New status
 * @param {boolean} setCompletionTime - Whether to set completion time (for COMPLETED status)
 * @returns {Promise<void>}
 */
export const updatePlayerHuntStatus = async (
  playerHuntId: string, 
  status: 'STARTED' | 'NOT_STARTED' | 'COMPLETED' | 'ABANDONED',
  setCompletionTime: boolean = false
): Promise<void> => {
  try {
    const updateData: any = { status };
    
    if (setCompletionTime && status === 'COMPLETED') {
      updateData.completionTime = serverTimestamp();
    }

    const huntRef = doc(db, 'playerHunts', playerHuntId);
    await updateDoc(huntRef, updateData);
  } catch (error: any) {
    throw error;
  }
};

// ============================================================================
// CheckIns Collection Functions
// ============================================================================

/**
 * Create a check-in for a location completion
 * @param {string} userId - ID of the user
 * @param {string} huntId - ID of the hunt
 * @param {string} locationId - ID of the completed location
 * @returns {Promise<string>} - ID of the created checkIn document
 */
export const createCheckIn = async (userId: string, huntId: string, locationId: string): Promise<string> => {
  try {
    // Check if user already checked in to this location for this hunt
    const existingCheckIn = await getCheckIn(userId, huntId, locationId);
    if (existingCheckIn) {
      throw new Error('Already checked in to this location');
    }

    const docRef = await addDoc(collection(db, 'checkIns'), {
      userId: userId,
      huntId: huntId,
      locationId: locationId,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get a specific check-in
 * @param {string} userId - ID of the user
 * @param {string} huntId - ID of the hunt
 * @param {string} locationId - ID of the location
 * @returns {Promise<CheckIn | null>}
 */
export const getCheckIn = async (userId: string, huntId: string, locationId: string): Promise<CheckIn | null> => {
  try {
    const q = query(
      collection(db, 'checkIns'),
      where('userId', '==', userId),
      where('huntId', '==', huntId),
      where('locationId', '==', locationId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      checkInId: doc.id,
      ...doc.data()
    } as CheckIn;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get all check-ins for a user in a specific hunt
 * @param {string} userId - ID of the user
 * @param {string} huntId - ID of the hunt
 * @returns {Promise<CheckIn[]>}
 */
export const getHuntCheckIns = async (userId: string, huntId: string): Promise<CheckIn[]> => {
  try {
    const q = query(
      collection(db, 'checkIns'),
      where('userId', '==', userId),
      where('huntId', '==', huntId),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      checkInId: doc.id,
      ...doc.data()
    })) as CheckIn[];
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get all check-ins for a user across all hunts
 * @param {string} userId - ID of the user
 * @returns {Promise<CheckIn[]>}
 */
export const getUserCheckIns = async (userId: string): Promise<CheckIn[]> => {
  try {
    const q = query(
      collection(db, 'checkIns'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      checkInId: doc.id,
      ...doc.data()
    })) as CheckIn[];
  } catch (error: any) {
    throw error;
  }
};

/**
 * Calculate hunt progress for a player
 * @param {string} userId - ID of the user
 * @param {string} huntId - ID of the hunt
 * @returns {Promise<{completed: number, total: number, percentage: number}>}
 */
export const getHuntProgress = async (userId: string, huntId: string): Promise<{completed: number, total: number, percentage: number}> => {
  try {
    // Get total number of locations in the hunt
    const locations = await getHuntLocations(huntId);
    const total = locations.length;
    
    // Get number of completed locations (check-ins)
    const checkIns = await getHuntCheckIns(userId, huntId);
    const completed = checkIns.length;
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  } catch (error: any) {
    throw error;
  }
};