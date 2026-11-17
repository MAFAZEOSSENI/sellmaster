import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';

import '../firebase_options.dart';
import '../pages/orders_page.dart';
import 'api_service.dart';
import 'notification_service.dart';

class FcmService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  static final FcmService _instance = FcmService._internal();
  static const AndroidNotificationChannel _ordersChannel =
      AndroidNotificationChannel(
    'orders',
    'Commandes',
    description: 'Notifications liées aux commandes Sellmaster',
    importance: Importance.max,
    playSound: true,
  );

  StreamSubscription<String>? _tokenRefreshSubscription;
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;
  GlobalKey<NavigatorState>? _navigatorKey;
  int? _pendingOrderId;
  bool _initialized = false;

  factory FcmService() => _instance;

  FcmService._internal();

  Future<void> initialize(
    NotificationService notificationService, {
    required GlobalKey<NavigatorState> navigatorKey,
  }) async {
    _navigatorKey = navigatorKey;
    if (_initialized) return;
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      }
      await _requestPermission();

      if (!kIsWeb) {
        const initializationSettings = InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
          linux: LinuxInitializationSettings(defaultActionName: 'Ouvrir'),
        );
        await _localNotifications.initialize(
          initializationSettings,
          onDidReceiveNotificationResponse: (response) {
            final payload = response.payload;
            if (payload == null || payload.isEmpty) return;
            try {
              final data = Map<String, dynamic>.from(jsonDecode(payload));
              _openRelatedItem(data);
            } catch (_) {
              // Ignore malformed local notification payloads.
            }
          },
        );
        await _localNotifications
            .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
            ?.createNotificationChannel(_ordersChannel);
      }

      _foregroundSubscription = FirebaseMessaging.onMessage.listen((message) async {
        final title = message.notification?.title ?? 'Nouvelle notification';
        final body = message.notification?.body ?? 'Vous avez un nouveau message.';
        final notificationId = message.data['notificationId']?.toString();
        await notificationService.show(
          title: title,
          message: body,
          type: AppNotificationType.info,
          id: notificationId,
          relatedType: message.data['relatedType']?.toString(),
          relatedId: message.data['relatedId']?.toString(),
          playSound: false,
        );
        await _showForegroundNotification(message, title, body);
      });

      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
      _openedSubscription = FirebaseMessaging.onMessageOpenedApp.listen((message) {
        _openRelatedItem(message.data);
      });
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) _openRelatedItem(initialMessage.data);
      _tokenRefreshSubscription = _messaging.onTokenRefresh.listen((token) {
        if (ApiService.authToken != null) {
          unawaited(_registerToken(token));
        }
      });
      _initialized = true;
    } catch (error) {
      if (kDebugMode) {
        print('FCM init error: $error');
      }
    }
  }

  Future<void> registerDeviceAfterLogin() async {
    try {
      final token = await _messaging.getToken();
      if (token != null && token.isNotEmpty) await _registerToken(token);
    } catch (error) {
      if (kDebugMode) print('FCM token registration error: $error');
    }
  }

  Future<void> unregisterDeviceBeforeLogout() async {
    try {
      final token = await _messaging.getToken();
      if (token != null && token.isNotEmpty) {
        await ApiService.unregisterDeviceToken(token);
      }
    } catch (error) {
      if (kDebugMode) print('FCM token removal error: $error');
    }
  }

  Future<void> _registerToken(String token) async {
    final platform = kIsWeb
        ? 'web'
        : defaultTargetPlatform == TargetPlatform.iOS
            ? 'ios'
            : 'android';
    await ApiService.registerDeviceToken(token, platform);
  }

  Future<void> _showForegroundNotification(
    RemoteMessage message,
    String title,
    String body,
  ) async {
    if (kIsWeb) return;
    final rawId = message.data['notificationId']?.toString();
    final id = int.tryParse(rawId ?? '') ?? DateTime.now().millisecondsSinceEpoch.remainder(1 << 31);
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'orders',
        'Commandes',
        channelDescription: 'Notifications liées aux commandes Sellmaster',
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
      ),
      iOS: DarwinNotificationDetails(presentAlert: true, presentSound: true),
      linux: LinuxNotificationDetails(defaultActionName: 'Ouvrir'),
    );
    await _localNotifications.show(
      id,
      title,
      body,
      details,
      payload: jsonEncode(message.data),
    );
  }

  void handlePendingNavigation() {
    final orderId = _pendingOrderId;
    if (orderId == null || _navigatorKey?.currentState == null) return;
    _pendingOrderId = null;
    _navigatorKey!.currentState!.push(
      MaterialPageRoute<void>(builder: (_) => OrdersPage(initialOrderId: orderId)),
    );
  }

  void _openRelatedItem(Map<String, dynamic> data) {
    if (data['relatedType']?.toString() != 'order') return;
    final orderId = int.tryParse(data['relatedId']?.toString() ?? '');
    if (orderId == null) return;
    final navigator = _navigatorKey?.currentState;
    if (navigator == null || ApiService.authToken == null) {
      _pendingOrderId = orderId;
      return;
    }
    navigator.push(
      MaterialPageRoute<void>(builder: (_) => OrdersPage(initialOrderId: orderId)),
    );
  }

  void dispose() {
    unawaited(_tokenRefreshSubscription?.cancel());
    unawaited(_foregroundSubscription?.cancel());
    unawaited(_openedSubscription?.cancel());
    _initialized = false;
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
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  }
  if (message.notification != null) {
    if (kDebugMode) {
      print('Background message: ${message.notification!.title}');
    }
  }
}
