// ==========================================================================
// FIREBASE CONFIGURATION & INITIALIZATION HELPERS
// ==========================================================================

// Copy and paste your Web App configuration from the Firebase Console here.
// Go to: Firebase Console -> Project Settings -> General -> Your apps -> Add app (Web)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "quanlycongviec1.firebaseapp.com",
    projectId: "quanlycongviec1",
    storageBucket: "quanlycongviec1.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Check if the placeholder config has been replaced with actual credentials
function isFirebaseEnabled() {
    return firebaseConfig.apiKey && 
           firebaseConfig.apiKey !== "YOUR_API_KEY" && 
           firebaseConfig.appId && 
           firebaseConfig.appId !== "YOUR_APP_ID";
}

// Global reference for Firebase Firestore
let firestoreDb = null;

if (isFirebaseEnabled()) {
    try {
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        firestoreDb = firebase.firestore();
        console.log("🔥 Kết nối Firebase Cloud Firestore thành công!");
    } catch (e) {
        console.error("❌ Lỗi khi khởi tạo Firebase:", e);
    }
} else {
    console.log("💾 Đang sử dụng cơ sở dữ liệu LocalStorage (Chưa cấu hình Firebase).");
}
