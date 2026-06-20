// ==========================================================================
// FIREBASE CONFIGURATION & INITIALIZATION HELPERS
// ==========================================================================

// Copy and paste your Web App configuration from the Firebase Console here.
// Go to: Firebase Console -> Project Settings -> General -> Your apps -> Add app (Web)
const firebaseConfig = {
  apiKey: "AIzaSyDBflE_tjS9WV5oGYf-NTDT403PzH-jz94",
  authDomain: "flutter-ai-playgroun-a16ad.firebaseapp.com",
  databaseURL: "https://flutter-ai-playgroun-a16ad-default-rtdb.firebaseio.com",
  projectId: "flutter-ai-playgroun-a16ad",
  storageBucket: "flutter-ai-playgroun-a16ad.firebasestorage.app",
  messagingSenderId: "164986767650",
  appId: "1:164986767650:web:736579875ca441e1763d7b"
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
