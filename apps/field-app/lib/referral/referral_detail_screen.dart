import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../data/db.dart';
import '../utils/constants.dart';
import '../widgets/app_scaffold.dart';

class ReferralDetailScreen extends StatelessWidget {
  const ReferralDetailScreen({super.key});

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
            ],
          ),
        );
      },
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
