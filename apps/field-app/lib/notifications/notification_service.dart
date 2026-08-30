import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Wraps flutter_local_notifications for escalation alerts.
/// Tapping a notification opens the app and routes straight to the
/// referral detail (caseload ref) page for that promise.
class NotificationService {
  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  GlobalKey<NavigatorState>? navigatorKey;
  bool _initialized = false;

  static const _channelId = 'escalations';
  static const _channelName = 'Escalation alerts';
  static const _channelDesc = 'Alerts when a referred patient is escalated (no facility arrival recorded)';

  Future<void> init() async {
    if (_initialized) return;
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(
      const InitializationSettings(android: androidInit),
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(const AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDesc,
      importance: Importance.high,
    ));
    // Android 13+ runtime permission
    await android?.requestNotificationsPermission();
    _initialized = true;
  }

  Future<void> notifyEscalated({
    required String promiseId,
    required String title,
    required String body,
  }) async {
    await init();
    await _plugin.show(
      promiseId.hashCode & 0x7FFFFFFF,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: _channelDesc,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
      payload: 'promise:$promiseId',
    );
  }

  /// Dismiss the system notification once the referral is handled/closed.
  Future<void> cancelFor(String promiseId) async {
    if (!_initialized) return;
    await _plugin.cancel(promiseId.hashCode & 0x7FFFFFFF);
  }

  void _onNotificationTap(NotificationResponse res) {
    final payload = res.payload;
    if (payload != null && payload.startsWith('promise:')) {
      final promiseId = payload.substring('promise:'.length);
      navigatorKey?.currentState?.pushNamed('/referralDetail', arguments: promiseId);
    }
  }
}
