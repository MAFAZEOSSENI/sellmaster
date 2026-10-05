import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'notification_service.dart';

class FcmService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FcmService _instance = FcmService._internal();

  factory FcmService() => _instance;

  FcmService._internal();

  Future<void> initialize(NotificationService notificationService) async {
    try {
      await Firebase.initializeApp();
      await _requestPermission();
      final token = await _messaging.getToken();
      if (kDebugMode) {
        print('FCM token: $token');
      }

      FirebaseMessaging.onMessage.listen((message) {
        final title = message.notification?.title ?? 'Nouvelle notification';
        final body = message.notification?.body ?? 'Vous avez un nouveau message.';

        notificationService.show(
          title: title,
          message: body,
          type: AppNotificationType.info,
        );
      });

      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        final title = message.notification?.title ?? 'Notification';
        final body = message.notification?.body ?? 'Ouvrez l\'application pour plus de détails.';

        notificationService.show(
          title: title,
          message: body,
          type: AppNotificationType.success,
        );
      });
    } catch (error) {
      if (kDebugMode) {
        print('FCM init error: $error');
      }
    }
  }

  Future<void> _requestPermission() async {
    if (defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS) {
      final settings = await _messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (kDebugMode) {
        print('FCM permission: ${settings.authorizationStatus}');
      }
    }
  }
}

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (message.notification != null) {
    if (kDebugMode) {
      print('Background message: ${message.notification!.title}');
    }
  }
}
