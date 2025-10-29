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
  updateDoc,
  deleteDoc,
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
  console.log('🔍 Getting hunts for user:', userId);
  
  try {
    // Try query with orderBy first
    let q = query(
      collection(db, 'hunts'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    let querySnapshot;
    
    try {
      console.log('📊 Trying query with orderBy...');
      querySnapshot = await getDocs(q);
      console.log('✅ Query with orderBy successful. Documents found:', querySnapshot.size);
    } catch (orderByError: any) {
      console.warn('⚠️ OrderBy query failed, trying without orderBy:', orderByError.message);
      
      // Fallback: query without orderBy if index doesn't exist
      q = query(
        collection(db, 'hunts'),
        where('userId', '==', userId)
      );
      
      querySnapshot = await getDocs(q);
      console.log('✅ Query without orderBy successful. Documents found:', querySnapshot.size);
    }

    const hunts: Hunt[] = [];

    querySnapshot.forEach((doc) => {
      const huntData = {
        id: doc.id,
        ...doc.data()
      } as Hunt;
      console.log('📄 Found hunt:', huntData);
      hunts.push(huntData);
    });

    // Sort in JavaScript if we couldn't use orderBy
    if (hunts.length > 0 && !hunts[0].createdAt) {
      console.log('🔄 Sorting hunts manually...');
      hunts.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });
    }

    console.log('✅ Returning', hunts.length, 'hunts');
    return hunts;
  } catch (error: any) {
    console.error('💥 Error getting user hunts:', error);
    console.error('💥 Error details:', error.code, error.message);
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
    
    console.log('✅ Hunt name updated successfully');
  } catch (error: any) {
    console.error('💥 Error updating hunt name:', error);
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
    console.log('🗑️ [Database Service] Starting hunt deletion for:', huntId);
    
    // First verify the hunt belongs to the user
    const hunt = await getHuntById(huntId);
    if (!hunt) {
      throw new Error('Hunt not found');
    }
    
    if (hunt.userId !== userId) {
      throw new Error('Unauthorized: Hunt does not belong to this user');
    }

    // Specify the document to delete (based on your suggested code pattern)
    const huntRef = doc(db, "hunts", huntId);
    
    // Delete the document
    await deleteDoc(huntRef)
      .then(() => {
        console.log("Hunt successfully deleted!");
      })
      .catch((error) => {
        console.error("Error deleting hunt: ", error);
        throw error;
      });
    
    console.log('✅ Hunt deleted successfully');
  } catch (error: any) {
    console.error('💥 Error deleting hunt:', error);
    throw error;
  }
};