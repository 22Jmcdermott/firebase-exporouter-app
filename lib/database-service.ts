/**
 * Database service for Firestore operations
 * Handles all database interactions for hunts and user data
 */
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
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import app from './firebase-config';

// Initialize Firestore
const db = getFirestore(app);
console.log('🔥 [Database Service] Firestore initialized:', db);

/**
 * Test Firestore connection
 * @returns {Promise<boolean>} - True if connection works
 */
export const testFirestoreConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 [Database Service] Testing Firestore connection...');
    const testCollection = collection(db, 'test');
    console.log('✅ [Database Service] Firestore connection test successful');
    return true;
  } catch (error: any) {
    console.error('💥 [Database Service] Firestore connection test failed:', error);
    return false;
  }
};

/**
 * Get all hunts (for debugging purposes)
 * @returns {Promise<Hunt[]>} - Array of all hunts
 */
export const getAllHunts = async (): Promise<Hunt[]> => {
  console.log('🔍 [Database Service] Getting ALL hunts (for debugging)...');
  
  try {
    const querySnapshot = await getDocs(collection(db, 'hunts'));
    console.log('📊 [Database Service] Total documents in hunts collection:', querySnapshot.size);
    
    const hunts: Hunt[] = [];
    querySnapshot.forEach((doc) => {
      const huntData = {
        id: doc.id,
        ...doc.data()
      } as Hunt;
      console.log('📄 [Database Service] Found hunt:', huntData);
      hunts.push(huntData);
    });

    return hunts;
  } catch (error: any) {
    console.error('💥 [Database Service] Error getting all hunts:', error);
    throw error;
  }
};

/**
 * Hunt interface for type safety
 */
export interface Hunt {
  id?: string;
  name: string;
  userId: string;
  createdAt: any; // Can be Date or Firestore Timestamp
}

/**
 * Create a new hunt for the current user
 * @param {string} huntName - Name of the hunt
 * @param {string} userId - ID of the user creating the hunt
 * @returns {Promise<string>} - ID of the created hunt
 */
export const createHunt = async (huntName: string, userId: string): Promise<string> => {
  try {
    const huntData = {
      name: huntName,
      userId: userId,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'hunts'), huntData);
    console.log('✅ Hunt created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error: any) {
    console.error('💥 Error creating hunt:', error);
    throw error;
  }
};

/**
 * Get all hunts for a specific user
 * @param {string} userId - ID of the user
 * @returns {Promise<Hunt[]>} - Array of user's hunts
 */
export const getUserHunts = async (userId: string): Promise<Hunt[]> => {
  try {
    const q = query(
      collection(db, 'hunts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const hunts: Hunt[] = [];

    querySnapshot.forEach((doc) => {
      const huntData = {
        id: doc.id,
        ...doc.data()
      } as Hunt;
      hunts.push(huntData);
    });

    return hunts;
  } catch (error: any) {
    console.error('💥 Error getting user hunts:', error);
    throw error;
  }
};

/**
 * Check if a hunt with the same name exists for the user
 * @param {string} huntName - Name of the hunt to check
 * @param {string} userId - ID of the user
 * @returns {Promise<boolean>} - True if hunt exists, false otherwise
 */
export const huntExistsForUser = async (huntName: string, userId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'hunts'),
      where('userId', '==', userId),
      where('name', '==', huntName)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if hunt exists:', error);
    throw error;
  }
};

/**
 * Get a specific hunt by ID
 * @param {string} huntId - ID of the hunt
 * @returns {Promise<Hunt | null>} - Hunt data or null if not found
 */
export const getHuntById = async (huntId: string): Promise<Hunt | null> => {
  try {
    const docRef = doc(db, 'hunts', huntId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Hunt;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting hunt:', error);
    throw error;
  }
};