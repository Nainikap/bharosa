import 'package:shared_preferences/shared_preferences.dart';
import '../data/db.dart';
import '../utils/constants.dart';
import 'notification_service.dart';

/// Watches local promises and fires a system notification the first time
/// a promise is seen with status `escalated` (patient never reached the
/// facility and the SLA lapsed). Notified ids are persisted so we alert
/// once per referral, not on every app open.
class EscalationMonitor {
  final AppDatabase db;
  final NotificationService notifications;

  EscalationMonitor(this.db, this.notifications);

  /// Returns the list of currently-escalated promises after firing
  /// notifications for any newly escalated ones.
  Future<List<Promise>> checkAndNotify() async {
    // Enforce local SLA clocks first — referrals past their deadline
    // escalate even when offline.
    await db.checkLocalDeadlines();
    final escalated = await db.getPromisesByStatus(PromiseStatus.escalated);
    final prefs = await SharedPreferences.getInstance();
    final notified = prefs.getStringList(AppConfig.notifiedEscalationsKey) ?? <String>[];

    for (final p in escalated) {
      if (notified.contains(p.id)) continue;
      final desc = decodeJson(p.descriptionJson);
      final patient = desc['patientName'] ?? 'A patient';
      final code = desc['code'] ?? p.id.substring(0, 8);
      await notifications.notifyEscalated(
        promiseId: p.id,
        title: 'Escalated: $patient did not reach the facility',
        body: 'Referral $code needs your action. Tap to handle it.',
      );
      notified.add(p.id);
    }
    await prefs.setStringList(AppConfig.notifiedEscalationsKey, notified);
    return escalated;
  }

  /// Called when an escalated referral is closed: clears the system
  /// notification. The id stays in the notified set so it never re-alerts.
  Future<void> dismiss(String promiseId) async {
    await notifications.cancelFor(promiseId);
  }
}
