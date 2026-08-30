import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../data/db.dart';
import '../utils/constants.dart';
import '../widgets/app_scaffold.dart';

class ReferralListScreen extends StatefulWidget {
  final String title;
  const ReferralListScreen({super.key, this.title = 'Referrals'});
  @override
  State<ReferralListScreen> createState() => _ReferralListScreenState();
}

class _ReferralListScreenState extends State<ReferralListScreen> {
  String filter = 'all';

  Color statusColor(String s) {
    switch (s) {
      case 'open':
        return AppColors.yellow;
      case 'kept':
        return AppColors.teal;
      case 'lapsed':
        return Colors.orange;
      case 'escalated':
        return AppColors.red;
      default:
        return AppColors.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final db = Provider.of<AppDatabase>(context);
    return AppScaffold(
      title: widget.title,
      actions: [
        PopupMenuButton<String>(
          onSelected: (v) => setState(() => filter = v),
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'all', child: Text('All')),
            PopupMenuItem(value: 'open', child: Text('Open')),
            PopupMenuItem(value: 'kept', child: Text('Kept')),
            PopupMenuItem(value: 'escalated', child: Text('Escalated')),
          ],
          icon: const Icon(Icons.filter_list),
        ),
      ],
      body: StreamBuilder<List<Promise>>(
        stream: db.select(db.promises).watch(),
        builder: (context, snap) {
          final all = snap.data ?? [];
          List<Promise> list = all;
          if (filter != 'all') list = all.where((p) => p.status == filter).toList();
          if (list.isEmpty) {
            return Center(
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(Icons.assignment, size: 48, color: AppColors.muted),
                const SizedBox(height: 10),
                const Text('No referrals', style: TextStyle(color: AppColors.muted)),
                const SizedBox(height: 6),
                Text(filter == 'all' ? 'Referrals will appear here after you create them.' : 'Filter: $filter', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
              ]),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(12),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final p = list[i];
              final desc = _decode(p.descriptionJson);
              final code = desc['code'] ?? p.id.substring(0, 8);
              final patient = desc['patientName'] ?? '-';
              return InkWell(
                onTap: () => Navigator.pushNamed(context, '/referralDetail', arguments: p.id),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.line)),
                  child: Row(children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: statusColor(p.status).withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                      child: Text(p.status.toUpperCase(), style: TextStyle(color: statusColor(p.status), fontSize: 10, fontWeight: FontWeight.w800)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('$patient · $code', style: const TextStyle(color: AppColors.head, fontWeight: FontWeight.w700, fontSize: 13)),
                        const SizedBox(height: 2),
                        Text('${desc['facility'] ?? p.toFacility ?? ''} · ${p.priority}',
                            style: const TextStyle(color: AppColors.muted, fontSize: 11)),
                        Text('Created: ${_fmt(p.createdAt)} · SLA: ${p.slaStart ?? 'pending sync'}',
                            style: const TextStyle(color: AppColors.muted, fontSize: 11)),
                      ]),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.muted, size: 18),
                  ]),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Map<String, dynamic> _decode(String s) {
    try {
      return jsonDecode(s) as Map<String, dynamic>;
    } catch (_) {
      return {};
    }
  }

  String _fmt(String iso) {
    try {
      final d = DateTime.parse(iso);
      return '${d.day}/${d.month} ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}
