import 'dart:async';
import 'dart:convert';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_service.dart';

enum AppNotificationType {
  success,
  info,
  warning,
  error,
}

class AppNotification {
  final String id;
  final String title;
  final String message;
  final AppNotificationType type;
  final DateTime createdAt;
  final bool read;

  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.createdAt,
    this.read = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'type': type.name,
        'createdAt': createdAt.toIso8601String(),
        'read': read,
      };

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id']?.toString() ?? DateTime.now().microsecondsSinceEpoch.toString(),
        title: json['title'] ?? 'Notification',
        message: json['message'] ?? '',
        type: AppNotificationType.values.firstWhere(
          (type) => type.name == (json['type'] ?? 'info'),
          orElse: () => AppNotificationType.info,
        ),
        createdAt: DateTime.tryParse(json['createdAt'] ?? json['created_at'] ?? '') ?? DateTime.now(),
        read: json['read'] == true || json['is_read'] == true,
      );
}

class NotificationService extends ChangeNotifier {
  static const String _storageKey = 'sellmaster_notifications_v1';

  final AudioPlayer _audioPlayer = AudioPlayer();
  List<AppNotification> _items = [];

  NotificationService() {
    _load();
  }

  List<AppNotification> get items => List.unmodifiable(_items);

  int get unreadCount => _items.where((item) => !item.read).length;

  bool get hasUnread => unreadCount > 0;

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    if (raw == null || raw.isEmpty) return;

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return;

      _items = decoded
          .whereType<Map<String, dynamic>>()
          .map(AppNotification.fromJson)
          .toList();
      notifyListeners();
    } catch (_) {
      _items = [];
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    final payload = jsonEncode(_items.map((item) => item.toJson()).toList());
    await prefs.setString(_storageKey, payload);
  }

  Future<void> syncFromServer() async {
    try {
      final response = await ApiService.getNotifications();
      final notifications = response['notifications'] as List? ?? const [];
      _items = notifications
          .map((item) => AppNotification.fromJson(Map<String, dynamic>.from(item)))
          .toList();
      notifyListeners();
      await _persist();
    } catch (_) {
      // Keep local fallback if backend is unreachable.
    }
  }

  Future<void> show({
    required String title,
    required String message,
    AppNotificationType type = AppNotificationType.info,
    bool read = false,
  }) async {
    final item = AppNotification(
      id: DateTime.now().microsecondsSinceEpoch.toString(),
      title: title,
      message: message,
      type: type,
      createdAt: DateTime.now(),
      read: read,
    );

    _items = [item, ..._items].take(50).toList();
    notifyListeners();
    await _persist();
    unawaited(_playSound());
  }

  Future<void> _playSound() async {
    try {
      await _audioPlayer.play(AssetSource('sounds/notification.wav'));
    } catch (_) {
      // Ignorer si le son est indisponible sur la plateforme.
    }
  }

  Future<void> markAllAsRead() async {
    _items = _items
        .map((item) => AppNotification(
              id: item.id,
              title: item.title,
              message: item.message,
              type: item.type,
              createdAt: item.createdAt,
              read: true,
            ))
        .toList();
    notifyListeners();
    await _persist();

    try {
      await ApiService.markNotificationsAsRead();
    } catch (_) {
      // No-op: local cache still updates and backend can retry later.
    }
  }

  void clear() {
    _items = [];
    notifyListeners();
    _persist();
  }

  Future<void> showSnackBar(
    BuildContext context, {
    required String title,
    required String message,
    AppNotificationType type = AppNotificationType.info,
  }) async {
    unawaited(show(title: title, message: message, type: type));

    final color = switch (type) {
      AppNotificationType.success => Colors.green,
      AppNotificationType.warning => Colors.orange,
      AppNotificationType.error => Colors.red,
      AppNotificationType.info => const Color(0xFF00BCD4),
    };

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              switch (type) {
                AppNotificationType.success => Icons.check_circle_outline,
                AppNotificationType.warning => Icons.warning_amber_rounded,
                AppNotificationType.error => Icons.error_outline,
                AppNotificationType.info => Icons.info_outline,
              },
              color: Colors.white,
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
      ),
    );
  }
}
