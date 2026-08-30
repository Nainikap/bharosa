import 'dart:convert';
import 'package:drift/drift.dart' as drift;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../data/db.dart';
import '../auth/auth_service.dart';
import '../notifications/escalation_monitor.dart';
import '../sync/sync_service.dart';
import '../utils/constants.dart';
import '../widgets/app_scaffold.dart';

class ReferralDetailScreen extends StatefulWidget {
  const ReferralDetailScreen({super.key});

  @override
  State<ReferralDetailScreen> createState() => _ReferralDetailScreenState();
}

class _ReferralDetailScreenState extends State<ReferralDetailScreen> {
  final _reasonCtrl = TextEditingController();
  final _actionCtrl = TextEditingController();
  bool _closing = false;

  @override
  void dispose() {
    _reasonCtrl.dispose();
    _actionCtrl.dispose();
    super.dispose();
  }

  Future<void> _closeReferral(Promise p) async {
    final reason = _reasonCtrl.text.trim();
    final action = _actionCtrl.text.trim();
    if (reason.isEmpty || action.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Please fill in both the reason and the action taken before closing.'),
        backgroundColor: AppColors.red,
      ));
      return;
    }

    setState(() => _closing = true);
    final db = Provider.of<AppDatabase>(context, listen: false);
    final sync = Provider.of<SyncService>(context, listen: false);
    final monitor = Provider.of<EscalationMonitor>(context, listen: false);
    final ashaName = await AuthService().getAshaName();
    final now = DateTime.now().toIso8601String();

    // Record the resolution inside the referral description
    final desc = _decode(p.descriptionJson);
    desc['resolutionReason'] = reason;
    desc['resolutionAction'] = action;
    desc['resolvedAt'] = now;
    desc['resolvedBy'] = ashaName;

    await (db.update(db.promises)..where((t) => t.id.equals(p.id))).write(
      PromisesCompanion(
        status: const drift.Value(PromiseStatus.closedNa),
        descriptionJson: drift.Value(jsonEncode(desc)),
        dirty: const drift.Value(1),
      ),
    );

    // Enqueue the closure for the next sync (offline-safe)
    await sync.enqueue(
      entity: 'referral_update',
      priority: 'referral',
      payload: {
        'id': p.id,
        'status': PromiseStatus.closedNa,
        'resolutionReason': reason,
        'resolutionAction': action,
        'resolvedAt': now,
        'resolvedBy': ashaName,
      },
    );

    // Dismiss the escalation notification for this referral
    await monitor.dismiss(p.id);

    if (!mounted) return;
    setState(() => _closing = false);
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
      content: Text('Referral closed with resolution recorded.'),
      backgroundColor: AppColors.teal,
    ));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final id = ModalRoute.of(context)!.settings.arguments as String;
    final db = Provider.of<AppDatabase>(context);
    return StreamBuilder<Promise?>(
      stream: (db.select(db.promises)..where((t) => t.id.equals(id))).watchSingleOrNull(),
      builder: (context, snap) {
        final p = snap.data;
        if (p == null) {
          return const AppScaffold(title: 'Referral Details', body: Center(child: CircularProgressIndicator()));
        }
        final desc = _decode(p.descriptionJson);
        final code = desc['code'] ?? p.id;
        final ladder = _decodeList(p.ladderJson);
        return AppScaffold(
          title: code,
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                child: Column(children: [
                  QrImageView(data: code, size: 160, backgroundColor: Colors.white),
                  const SizedBox(height: 8),
                  SelectableText(code, style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 2, fontSize: 18, color: Colors.black)),
                  Text('Priority: ${p.priority} · Status: ${p.status}', style: const TextStyle(color: Colors.black54, fontSize: 12)),
                ]),
              ),
              const SizedBox(height: 14),
              _row('Patient', desc['patientName'] ?? '-'),
              _row('Village / Household', '${desc['village'] ?? ''} · ${desc['householdId'] ?? ''}'),
              _row('Facility', desc['facility'] ?? p.toFacility ?? '-'),
              _row('Symptoms', (desc['symptoms'] as List?)?.join(', ') ?? '-'),
              _row('Message recipient', desc['messageRecipient'] ?? 'Not recorded'),
              _row('Message delivery', desc['messageChannel'] ?? 'Pending'),
              const Divider(color: AppColors.line, height: 24),
              _row('Created (device)', _fmt(p.createdAt)),
              _row('SLA start (server)', p.slaStart ?? 'pending sync — dual-clock V1'),
              _row('Deadline', p.deadline ?? '—'),
              _row('Evidence', p.evidenceJson ?? '—'),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.line)),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Escalation ladder', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  ...ladder.map((e) {
                    final m = e as Map<String, dynamic>;
                    final ack = m['ackAt'] != null ? '✓ ack ${m['ackAt']}' : '— pending';
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3),
                      child: Row(children: [
                        const Icon(Icons.person, size: 14, color: AppColors.muted),
                        const SizedBox(width: 6),
                        Expanded(child: Text('${m['role']}', style: const TextStyle(color: Colors.white, fontSize: 12))),
                        Text(ack, style: const TextStyle(color: Colors.white, fontSize: 11)),
                      ]),
                    );
                  }),
                ]),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.line)),
                child: const Text(
                  'Escalation ladder: ASHA → Block MO → District nodal. Miss → related officer sent SMS (mock) + HMAC deep-link.',
                  style: TextStyle(color: AppColors.muted, fontSize: 11),
                ),
              ),
              if (p.status == PromiseStatus.escalated) ...[
                const SizedBox(height: 14),
                _handleCard(p),
              ],
              if (p.status == PromiseStatus.closedNa) ...[
                const SizedBox(height: 14),
                _resolutionCard(desc),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _handleCard(Promise p) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.redBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.red),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.notification_important, color: AppColors.red, size: 18),
          SizedBox(width: 6),
          Text('Handle escalation', style: TextStyle(color: AppColors.head, fontWeight: FontWeight.w800, fontSize: 14)),
        ]),
        const SizedBox(height: 4),
        const Text(
          'No arrival was recorded for this referral within the SLA. Record why the patient did not reach and what you did, then close the referral.',
          style: TextStyle(color: AppColors.muted, fontSize: 11),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _reasonCtrl,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: 'Why did the patient not reach the facility?',
            hintText: 'e.g. Patient shifted to relative\'s village, no transport available…',
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _actionCtrl,
          maxLines: 2,
          decoration: InputDecoration(
            labelText: 'What action did you take?',
            hintText: 'e.g. Visited home, re-counselled family, arranged transport for tomorrow…',
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.red, padding: const EdgeInsets.symmetric(vertical: 12)),
            onPressed: _closing ? null : () => _closeReferral(p),
            icon: _closing
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.check_circle_outline),
            label: Text(_closing ? 'Closing…' : 'Close referral'),
          ),
        ),
      ]),
    );
  }

  Widget _resolutionCard(Map<String, dynamic> desc) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.teal.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.teal),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.task_alt, color: AppColors.teal, size: 18),
          SizedBox(width: 6),
          Text('Referral closed', style: TextStyle(color: AppColors.head, fontWeight: FontWeight.w800, fontSize: 14)),
        ]),
        const SizedBox(height: 8),
        _row('Reason (no arrival)', desc['resolutionReason'] ?? '—'),
        _row('Action taken', desc['resolutionAction'] ?? '—'),
        _row('Resolved by', desc['resolvedBy'] ?? '—'),
        _row('Resolved at', _fmt(desc['resolvedAt'] ?? '')),
      ]),
    );
  }

  Widget _row(String k, String v) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 110, child: Text(k, style: const TextStyle(color: AppColors.muted, fontSize: 12))),
        Expanded(child: Text(v, style: const TextStyle(color: AppColors.head, fontSize: 12))),
      ]),
    );
  }

  Map<String, dynamic> _decode(String s) {
    try {
      return jsonDecode(s) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  List<dynamic> _decodeList(String s) {
    try {
      return jsonDecode(s) as List<dynamic>;
    } catch (_) {
      return [];
    }
  }

  String _fmt(String iso) {
    try {
      final d = DateTime.parse(iso);
      return d.toLocal().toString().substring(0, 16);
    } catch (_) {
      return iso;
    }
  }
}
