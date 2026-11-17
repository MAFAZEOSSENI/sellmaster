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
  final String? relatedType;
  final String? relatedId;

  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.createdAt,
    this.read = false,
    this.relatedType,
    this.relatedId,
  });

  AppNotification copyWith({bool? read}) => AppNotification(
        id: id,
        title: title,
        message: message,
        type: type,
        createdAt: createdAt,
        read: read ?? this.read,
        relatedType: relatedType,
        relatedId: relatedId,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'type': type.name,
        'createdAt': createdAt.toIso8601String(),
        'read': read,
        'relatedType': relatedType,
        'relatedId': relatedId,
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
        relatedType: (json['relatedType'] ?? json['related_type'])?.toString(),
        relatedId: (json['relatedId'] ?? json['related_id'])?.toString(),
      );
}

class NotificationService extends ChangeNotifier {
  static const String _storageKey = 'sellmaster_notifications_v1';

  final AudioPlayer _audioPlayer = AudioPlayer();
  static const String _lastSyncKey = 'sellmaster_notifications_last_sync_v1';
  List<AppNotification> _items = [];
  late final Future<void> _loaded;
  DateTime? _lastSyncAt;
  bool _isSyncing = false;

  NotificationService() {
    _loaded = _load();
  }

  List<AppNotification> get items => List.unmodifiable(_items);

  int get unreadCount => _items.where((item) => !item.read).length;

  bool get hasUnread => unreadCount > 0;

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    _lastSyncAt = DateTime.tryParse(prefs.getString(_lastSyncKey) ?? '');
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
    if (_isSyncing) return;
    _isSyncing = true;
    try {
      await _loaded;
      final response = await ApiService.getNotifications();
      final notifications = response['notifications'] as List? ?? const [];
      final previousIds = _items.map((item) => item.id).toSet();
        final previousSyncAt = _lastSyncAt;
      final serverItems = notifications
          .map((item) => AppNotification.fromJson(Map<String, dynamic>.from(item)))
          .toList();
      final newItems = serverItems.where((item) =>
          !previousIds.contains(item.id) &&
          previousSyncAt != null &&
          item.createdAt.isAfter(previousSyncAt)).toList();
      final merged = <String, AppNotification>{
        for (final item in _items) item.id: item,
        for (final item in serverItems) item.id: item,
      };
      _items = merged.values.toList()
        ..sort((left, right) => right.createdAt.compareTo(left.createdAt));
      _items = _items.take(50).toList();
      _lastSyncAt = DateTime.now();
      notifyListeners();
      await _persist();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_lastSyncKey, _lastSyncAt!.toIso8601String());
      for (final _ in newItems) {
        unawaited(_playSound());
      }
    } catch (_) {
      // Keep local fallback if backend is unreachable.
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> show({
    required String title,
    required String message,
    AppNotificationType type = AppNotificationType.info,
    bool read = false,
    String? id,
    String? relatedType,
    String? relatedId,
    bool playSound = true,
  }) async {
    final item = AppNotification(
      id: id ?? DateTime.now().microsecondsSinceEpoch.toString(),
      title: title,
      message: message,
      type: type,
      createdAt: DateTime.now(),
      read: read,
      relatedType: relatedType,
      relatedId: relatedId,
    );

    _items = [item, ..._items].take(50).toList();
    notifyListeners();
    await _persist();
    if (playSound) unawaited(_playSound());
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
        .map((item) => item.copyWith(read: true))
        .toList();
    notifyListeners();
    await _persist();

    try {
      await ApiService.markNotificationsAsRead();
    } catch (_) {
      // No-op: local cache still updates and backend can retry later.
    }
  }

  Future<void> markAsRead(String id) async {
    _items = _items.map((item) => item.id == id ? item.copyWith(read: true) : item).toList();
    notifyListeners();
    await _persist();
    final notificationId = int.tryParse(id);
    if (notificationId == null) return;
    try {
      await ApiService.markNotificationAsRead(notificationId);
    } catch (_) {
      // Local state remains updated if the server is temporarily unreachable.
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
      AppNotificationType.info => const Color(0xFF4869F2),
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
