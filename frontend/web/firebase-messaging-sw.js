importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyC7FlFCxPUAKg2hW3UnEh9t-Jr5_xnfjI8',
  authDomain: 'sellmaster-1ca2f.firebaseapp.com',
  projectId: 'sellmaster-1ca2f',
  storageBucket: 'sellmaster-1ca2f.firebasestorage.app',
  messagingSenderId: '336071265490',
  appId: '1:336071265490:web:20bd1637f6c80d8dff310b',
  measurementId: 'G-YRVWX6H34M',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Sellmaster';
  const body = payload.notification?.body || 'Nouvelle notification';

  self.registration.showNotification(title, {
    body,
    icon: '/icons/Icon-192.png',
  });
});
