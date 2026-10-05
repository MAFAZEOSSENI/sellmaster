import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/notification_service.dart';

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final notificationService = context.watch<NotificationService>();

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Notifications'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          if (notificationService.items.isNotEmpty)
            TextButton(
              onPressed: () => notificationService.markAllAsRead(),
              child: const Text('Tout marquer lu'),
            ),
        ],
      ),
      body: notificationService.items.isEmpty
          ? _EmptyNotificationsState()
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: notificationService.items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final item = notificationService.items[index];
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: item.read ? Colors.transparent : const Color(0xFF00BCD4).withOpacity(0.25),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: _typeColor(item.type).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          _typeIcon(item.type),
                          color: _typeColor(item.type),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    item.title,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                ),
                                if (!item.read)
                                  Container(
                                    width: 10,
                                    height: 10,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF00BCD4),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              item.message,
                              style: const TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _formatDate(item.createdAt),
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  Color _typeColor(AppNotificationType type) {
    switch (type) {
      case AppNotificationType.success:
        return Colors.green;
      case AppNotificationType.warning:
        return Colors.orange;
      case AppNotificationType.error:
        return Colors.red;
      case AppNotificationType.info:
      default:
        return const Color(0xFF00BCD4);
    }
  }

  IconData _typeIcon(AppNotificationType type) {
    switch (type) {
      case AppNotificationType.success:
        return Icons.check_circle_outline;
      case AppNotificationType.warning:
        return Icons.warning_amber_rounded;
      case AppNotificationType.error:
        return Icons.error_outline;
      case AppNotificationType.info:
      default:
        return Icons.info_outline;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1) {
      return 'À l\'instant';
    }
    if (diff.inHours < 1) {
      return 'Il y a ${diff.inMinutes} min';
    }
    if (diff.inDays < 1) {
      return 'Il y a ${diff.inHours} h';
    }
    return 'Il y a ${diff.inDays} j';
  }
}

class _EmptyNotificationsState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                color: const Color(0xFFE0F7FA),
                borderRadius: BorderRadius.circular(28),
              ),
              child: const Icon(
                Icons.notifications_none_rounded,
                size: 42,
                color: Color(0xFF00BCD4),
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Aucune notification',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Les alertes importantes apparaîtront ici.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
