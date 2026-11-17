import 'package:flutter_test/flutter_test.dart';
import 'package:gestion_commandes_app/services/notification_service.dart';

void main() {
  test('AppNotification preserves related order metadata through JSON round trip', () {
    final notification = AppNotification.fromJson({
      'id': 42,
      'title': 'Commande assignée',
      'message': 'La commande SM-2026-001 vous a été assignée.',
      'type': 'info',
      'created_at': '2026-11-13T10:00:00.000Z',
      'is_read': false,
      'related_type': 'order',
      'related_id': 19,
    });

    final restored = AppNotification.fromJson(notification.toJson());
    expect(restored.id, '42');
    expect(restored.relatedType, 'order');
    expect(restored.relatedId, '19');
    expect(restored.copyWith(read: true).relatedType, 'order');
    expect(restored.copyWith(read: true).relatedId, '19');
    expect(restored.copyWith(read: true).read, isTrue);
  });
}
