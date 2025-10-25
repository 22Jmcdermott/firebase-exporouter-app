/**
 * Firebase Firestore Database Service
 * Purpose: Handles all database operations for the Scavenger Hunt app
 */
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  FirestoreError
} from 'firebase/firestore';
import { auth } from './firebase-config';
import app from './firebase-config';

// Initialize Firestore
export const db = getFirestore(app);

// ============================================================================
// Hunt Management Functions
// ============================================================================

/**
 * Interface for Hunt document structure
 */
export interface Hunt {
  id?: string;
  name: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  description?: string;
  isCompleted?: boolean;
}

/**
 * Create a new hunt for the current user
 * @param huntName - Name of the hunt (max 255 characters)
 * @param description - Optional description of the hunt
 * @returns Promise<string> - The ID of the created hunt
 */
export const createHunt = async (huntName: string, description?: string): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to create a hunt');
  }

  // Validate hunt name length
  if (huntName.trim().length === 0) {
    throw new Error('Hunt name cannot be empty');
  }
  
  if (huntName.length > 255) {
    throw new Error('Hunt name must be 255 characters or less');
  }

  // Check if hunt with same name exists for this user
  const existingHunt = await checkHuntNameExists(huntName.trim(), currentUser.uid);
  if (existingHunt) {
    throw new Error(`A hunt with the name "${huntName}" already exists. Please choose a unique name.`);
  }

  try {
    const huntData: Omit<Hunt, 'id'> = {
      name: huntName.trim(),
      userId: currentUser.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      description: description?.trim() || '',
      isCompleted: false
    };

    const docRef = await addDoc(collection(db, 'hunts'), huntData);
    console.log('Hunt created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating hunt:', error);
    throw new Error('Failed to create hunt. Please try again.');
  }
};

/**
 * Check if a hunt name already exists for the current user
 * @param huntName - Name to check
 * @param userId - User ID to check against
 * @returns Promise<boolean> - True if hunt exists, false otherwise
 */
export const checkHuntNameExists = async (huntName: string, userId: string): Promise<boolean> => {
  try {
    const huntsRef = collection(db, 'hunts');
    const q = query(
      huntsRef, 
      where('userId', '==', userId),
      where('name', '==', huntName.trim())
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking hunt name:', error);
    return false;
  }
};

/**
 * Fetch all hunts for the current user
 * @returns Promise<Hunt[]> - Array of user's hunts
 */
export const getUserHunts = async (): Promise<Hunt[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to fetch hunts');
  }

  try {
    const huntsRef = collection(db, 'hunts');
    const q = query(
      huntsRef,
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const hunts: Hunt[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      hunts.push({
        id: doc.id,
        name: data.name,
        userId: data.userId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        description: data.description || '',
        isCompleted: data.isCompleted || false
      });
    });

    console.log(`✅ Retrieved ${hunts.length} hunts for user`);
    return hunts;
  } catch (error) {
    console.error('❌ Error fetching user hunts:', error);
    throw new Error('Failed to fetch hunts. Please try again.');
  }
};

/**
 * Get a specific hunt by ID
 * @param huntId - The hunt document ID
 * @returns Promise<Hunt | null> - The hunt data or null if not found
 */
export const getHuntById = async (huntId: string): Promise<Hunt | null> => {
  try {
    const huntRef = doc(db, 'hunts', huntId);
    const huntSnap = await getDoc(huntRef);

    if (huntSnap.exists()) {
      const data = huntSnap.data();
      return {
        id: huntSnap.id,
        name: data.name,
        userId: data.userId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        description: data.description || '',
        isCompleted: data.isCompleted || false
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching hunt by ID:', error);
    throw new Error('Failed to fetch hunt details.');
  }
};

/**
 * Generate suggested hunt names based on user input
 * @param baseName - The base name to generate suggestions from
 * @param userId - Current user ID
 * @returns Promise<string[]> - Array of suggested available names
 */
export const generateHuntNameSuggestions = async (baseName: string, userId: string): Promise<string[]> => {
  const suggestions: string[] = [];
  const cleanBaseName = baseName.trim();
  
  // Generate potential variations
  const variations = [
    `${cleanBaseName} 2`,
    `${cleanBaseName} (New)`,
    `${cleanBaseName} - ${new Date().getFullYear()}`,
    `My ${cleanBaseName}`,
    `${cleanBaseName} Adventure`,
    `${cleanBaseName} Quest`
  ];

  // Check which variations are available
  for (const variation of variations) {
    const exists = await checkHuntNameExists(variation, userId);
    if (!exists && variation.length <= 255) {
      suggestions.push(variation);
    }
    
    // Return max 3 suggestions
    if (suggestions.length >= 3) {
      break;
    }
  }

  return suggestions;
};

/**
 * Subscribe to real-time updates of user's hunts
 * @param userId - User ID to filter hunts by
 * @param callback - Function to call when hunts are updated
 * @returns Unsubscribe function
 */
export const subscribeToUserHunts = (userId: string, callback: (hunts: Hunt[]) => void) => {
  try {
    const huntsRef = collection(db, 'hunts');
    const q = query(
      huntsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const hunts: Hunt[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        hunts.push({
          id: doc.id,
          name: data.name,
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          description: data.description || '',
          isCompleted: data.isCompleted || false
        });
      });

      console.log(`📊 Real-time update: ${hunts.length} hunts for user`);
      callback(hunts);
    }, (error: FirestoreError) => {
      console.error('❌ Error in hunt subscription:', error);
      // Call callback with empty array on error
      callback([]);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up hunt subscription:', error);
    // Return a no-op function
    return () => {};
  }
};