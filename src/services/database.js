import { firestore, storage } from './firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, orderBy, getDoc, increment, arrayRemove, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Utility Requests
export const createUtilityRequest = async (requestData) => {
  try {
    const docRef = await addDoc(collection(firestore, 'utilityRequests'), requestData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating utility request:', error);
    throw error;
  }
};

export const getUtilityRequests = async (userId) => {
  try {
    const q = query(
      collection(firestore, 'utilityRequests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting utility requests:', error);
    throw error;
  }
};

// Visual Aids with shared access
export const createVisualAid = async (presentationData) => {
  try {
    // Ensure uploadedAt is a proper timestamp if not already
    const uploadedAt = presentationData.uploadedAt instanceof Date 
      ? presentationData.uploadedAt 
      : new Date();

    // Store file type information
    const fileType = presentationData.fileType || 'application/pdf'; // Default to PDF for backward compatibility

    const docRef = await addDoc(collection(firestore, 'visualAids'), {
      ...presentationData,
      uploadedAt,
      createdAt: uploadedAt, // Add createdAt to match the query
      fileType,
      isShared: true, // Make all visual aids shared by default
      status: presentationData.status || 'approved', // Default to approved if not specified
      viewCount: presentationData.viewCount || 0,
      likes: presentationData.likes || 0,
      likedBy: presentationData.likedBy || []
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating visual aid:', error);
    throw error;
  }
};

export const getAllVisualAids = async () => {
  try {
    console.log('Fetching all visual aids...');
    const q = query(
      collection(firestore, 'visualAids'),
      orderBy('uploadedAt', 'desc') // Change to uploadedAt to match the creation
    );
    
    const querySnapshot = await getDocs(q);
    const aids = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${aids.length} visual aids`);
    return aids;
  } catch (error) {
    console.error('Error getting visual aids:', error);
    throw error;
  }
};

export const likeVisualAid = async (visualAidId, userId) => {
  try {
    const visualAidRef = doc(firestore, 'visualAids', visualAidId);
    const visualAidDoc = await getDoc(visualAidRef);
    
    if (!visualAidDoc.exists()) {
      throw new Error('Visual aid not found');
    }

    const data = visualAidDoc.data();
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(userId);

    if (hasLiked) {
      // Unlike
      await updateDoc(visualAidRef, {
        likes: increment(-1),
        likedBy: arrayRemove(userId)
      });
    } else {
      // Like
      await updateDoc(visualAidRef, {
        likes: increment(1),
        likedBy: arrayUnion(userId)
      });
    }
  } catch (error) {
    console.error('Error updating visual aid likes:', error);
    throw error;
  }
};

export const incrementViewCount = async (visualAidId) => {
  try {
    const visualAidRef = doc(firestore, 'visualAids', visualAidId);
    await updateDoc(visualAidRef, {
      viewCount: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    throw error;
  }
};

// Doctors (MSL List)
export const createDoctor = async (doctorData) => {
  try {
    const docRef = await addDoc(collection(firestore, 'doctors'), doctorData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating doctor:', error);
    throw error;
  }
};

export const getDoctors = async (userId) => {
  try {
    const q = query(
      collection(firestore, 'doctors'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting doctors:', error);
    throw error;
  }
};

export const updateDoctorLastVisit = async (doctorId, lastVisitDate) => {
  try {
    const doctorRef = doc(firestore, 'doctors', doctorId);
    await updateDoc(doctorRef, {
      lastVisited: lastVisitDate
    });
  } catch (error) {
    console.error('Error updating doctor last visit:', error);
    throw error;
  }
};

// Tour Plans (STP)
export const createTourPlan = async (planData) => {
  try {
    const docRef = await addDoc(collection(firestore, 'tourPlans'), planData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating tour plan:', error);
    throw error;
  }
};

export const getTourPlans = async (userId) => {
  try {
    const q = query(
      collection(firestore, 'tourPlans'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting tour plans:', error);
    throw error;
  }
};

// File Upload Helpers
export const uploadImage = async (uri, folder) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = uri.substring(uri.lastIndexOf('/') + 1);
    const storageRef = ref(storage, `${folder}/${filename}`);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const uploadFile = async (uri, folder, filename) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `${folder}/${filename}`);
    
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Orders
export const createOrder = async (orderData) => {
  try {
    const docRef = await addDoc(collection(firestore, 'h-orders'), orderData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const getOrders = async (userId) => {
  try {
    const q = query(
      collection(firestore, 'h-orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
};

// Reports
export const createReport = async (reportData) => {
  try {
    const docRef = await addDoc(collection(firestore, 'reports'), reportData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
};

export const getReports = async (userId) => {
  try {
    const q = query(
      collection(firestore, 'reports'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
  }
};

// Expenses
export const createExpense = async (expenseData) => {
  try {
    const docRef = await addDoc(collection(firestore, 'expenses'), expenseData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
};

export const getExpenses = async (userId) => {
  try {
    const q = query(
      collection(firestore, 'expenses'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
};

// MSL addresses list
const MSL_ADDRESSES = [
  {
    doctorName: "Dr. Sharma's Clinic",
    address: "123 Medical Complex, Near City Hospital, Bhopal",
    location: "Bhopal"
  },
  {
    doctorName: "City Healthcare Center",
    address: "45 Healthcare Avenue, Indore Medical Hub, Indore",
    location: "Indore"
  },
  {
    doctorName: "Dr. Verma's Hospital",
    address: "78 Medical Square, Civil Lines, Jabalpur",
    location: "Jabalpur"
  },
  {
    doctorName: "Ujjain Medical Center",
    address: "234 Doctor's Lane, Near Railway Station, Ujjain",
    location: "Ujjain"
  },
  {
    doctorName: "Gwalior Health Institute",
    address: "567 Medical Campus, City Center, Gwalior",
    location: "Gwalior"
  },
  {
    doctorName: "Bhind General Hospital",
    address: "89 Hospital Road, Main Market, Bhind",
    location: "Bhind"
  },
  {
    doctorName: "Morena Medical Complex",
    address: "12 Healthcare Street, Near Bus Stand, Morena",
    location: "Morena"
  },
  {
    doctorName: "Dewas Health Center",
    address: "345 Medical Park, AB Road, Dewas",
    location: "Dewas"
  },
  {
    doctorName: "Sehore City Hospital",
    address: "678 Doctor's Colony, Main Road, Sehore",
    location: "Sehore"
  }
];

// Function to add MSL addresses to Firestore
export const addMSLAddresses = async (userId) => {
  try {
    // Check if addresses already exist
    const q = query(
      collection(firestore, 'addresses'),
      where('isMSL', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log('MSL addresses already exist in database');
      return;
    }

    // Add all MSL addresses
    const batch = [];
    for (const msl of MSL_ADDRESSES) {
      batch.push(
        addDoc(collection(firestore, 'addresses'), {
          ...msl,
          userId,
          isMSL: true,
          createdAt: new Date()
        })
      );
    }

    await Promise.all(batch);
    console.log('Successfully added MSL addresses to database');
  } catch (error) {
    console.error('Error adding MSL addresses:', error);
    throw error;
  }
};

// Function to fetch addresses with MSL data
export const fetchAddressesWithMSL = async (searchText) => {
  try {
    const q = query(
      collection(firestore, 'addresses'),
      where('address', '>=', searchText),
      where('address', '<=', searchText + '\uf8ff')
    );
    
    const querySnapshot = await getDocs(q);
    const addresses = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      addresses.push({
        address: data.address,
        doctorName: data.doctorName || null,
        location: data.location || null,
        isMSL: data.isMSL || false
      });
    });
    
    return addresses;
  } catch (error) {
    console.error('Error fetching addresses:', error);
    throw error;
  }
};

// Leaves
export const getLeaves = async (userId) => {
  try {
    console.log('Fetching leaves for user:', userId);
    const q = query(
      collection(firestore, 'leaves'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('Raw number of leaves found:', querySnapshot.size);
    
    // Get user's profile data
    const userDoc = await getDocs(query(
      collection(firestore, 'users'),
      where('userId', '==', userId)
    ));

    let userName = 'Unknown User';
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      userName = userData.fullName || userData.name || userData.displayName || 'Unknown User';
    }
    
    const leaves = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure dates are properly converted to Firestore Timestamps
      const startDate = data.startDate?.toDate ? data.startDate : null;
      const endDate = data.endDate?.toDate ? data.endDate : null;
      
      console.log('Processing leave:', {
        id: doc.id,
        type: data.type,
        status: data.status,
        userName: data.userName || userName,
        startDate: startDate?.toDate(),
        endDate: endDate?.toDate()
      });
      
      return {
        id: doc.id,
        ...data,
        userName: data.userName || userName,
        startDate,
        endDate
      };
    });
    
    console.log('Processed leaves:', leaves.map(leave => ({
      id: leave.id,
      status: leave.status,
      userName: leave.userName,
      startDate: leave.startDate?.toDate(),
      endDate: leave.endDate?.toDate()
    })));
    
    return leaves;
  } catch (error) {
    console.error('Error getting leaves:', error);
    throw error;
  }
}; 