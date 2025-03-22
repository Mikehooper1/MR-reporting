const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { deleteFile } = require('./services/storage');

admin.initializeApp();

// Scheduled function to run every day at midnight
exports.cleanupOldSelfies = functions.pubsub.schedule('0 0 * * *').onRun(async (context) => {
  try {
    const firestore = admin.firestore();
    const storage = admin.storage();
    
    // Calculate the date 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Get all reports with selfies older than 3 days
    const reportsSnapshot = await firestore
      .collection('reports')
      .where('createdAt', '<', threeDaysAgo)
      .where('selfieUrl', '!=', null)
      .get();
    
    const batch = firestore.batch();
    const deletePromises = [];

    reportsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.selfieUrl) {
        // Extract the file path from the selfie URL
        const selfieUrl = data.selfieUrl;
        try {
          // Get the file path from the URL
          const fileUrl = new URL(selfieUrl);
          const filePath = decodeURIComponent(fileUrl.pathname.split('/o/')[1].split('?')[0]);
          
          // Add delete operation to promises array
          deletePromises.push(
            storage.bucket().file(filePath).delete().catch(error => {
              console.error(`Error deleting file ${filePath}:`, error);
            })
          );
          
          // Update the document to remove the selfieUrl
          batch.update(doc.ref, {
            selfieUrl: null,
            selfieDeletedAt: new Date()
          });
        } catch (error) {
          console.error(`Error processing URL ${selfieUrl}:`, error);
        }
      }
    });

    // Execute all delete operations
    await Promise.all(deletePromises);
    
    // Commit the batch update
    await batch.commit();
    
    console.log(`Cleaned up ${deletePromises.length} old selfies`);
    return null;
  } catch (error) {
    console.error('Error in cleanupOldSelfies:', error);
    return null;
  }
}); 