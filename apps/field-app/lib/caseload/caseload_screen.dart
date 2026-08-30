import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../data/db.dart';
import '../utils/constants.dart';
import '../widgets/app_scaffold.dart';

class CaseloadScreen extends StatelessWidget {
  const CaseloadScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final db = Provider.of<AppDatabase>(context, listen: false);
    return AppScaffold(
      title: 'Caseload — Households',
      body: FutureBuilder<List<Household>>(
        future: db.getAllHouseholds(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final list = snap.data!;
          if (list.isEmpty) {
            return const Center(child: Text('No households available', style: TextStyle(color: AppColors.muted)));
          }
          return ListView.separated(
            padding: const EdgeInsets.all(14),
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final h = list[i];
              return InkWell(
                onTap: () => Navigator.pushNamed(context, '/household', arguments: h.id),
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.home, color: AppColors.teal),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(h.headName, style: const TextStyle(color: AppColors.head, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Text('${h.village} · ${h.landmark}',
                              style: const TextStyle(color: AppColors.muted, fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 4),
                          Text('ID: ${h.id} · ${h.catchment}',
                              style: const TextStyle(color: AppColors.muted, fontSize: 11)),
                        ]),
                      ),
                      const Icon(Icons.chevron_right, color: AppColors.muted),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class HouseholdDetailScreen extends StatelessWidget {
  const HouseholdDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final id = ModalRoute.of(context)!.settings.arguments as String;
    final db = Provider.of<AppDatabase>(context, listen: false);

    return FutureBuilder<Household?>(
      future: db.getHousehold(id),
      builder: (context, snap) {
        if (!snap.hasData) {
          return AppScaffold(title: 'Household', body: const Center(child: CircularProgressIndicator()));
        }
        final h = snap.data;
        if (h == null) {
          return const AppScaffold(title: 'Household', body: Center(child: Text('Not found', style: TextStyle(color: AppColors.muted))));
        }
        return AppScaffold(
          title: h.headName,
          body: FutureBuilder<List<Patient>>(
            future: db.getPatientsForHousehold(h.id),
            builder: (context, pSnap) {
              final patients = pSnap.data ?? [];
              return ListView(
                padding: const EdgeInsets.all(14),
                children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.line),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(h.headName, style: const TextStyle(color: AppColors.head, fontSize: 18, fontWeight: FontWeight.w800)),
                      Text('${h.village} — ${h.landmark}', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                      const SizedBox(height: 6),
                      Text('Household ID: ${h.id}', style: const TextStyle(color: AppColors.muted, fontSize: 11)),
                    ]),
                  ),
                  const SizedBox(height: 14),
                  const Text('Family members', style: TextStyle(color: AppColors.head, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  ...patients.map((p) => Card(
                        color: AppColors.card,
                        shape: RoundedRectangleBorder(
                            side: const BorderSide(color: AppColors.line), borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppColors.navy,
                            child: Text(p.name.isNotEmpty ? p.name[0] : '?', style: const TextStyle(color: Colors.white)),
                          ),
                          title: Text(p.name, style: const TextStyle(color: AppColors.head, fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            '${p.gender ?? ''} · ${p.ageMonths ?? '-'} months · DOB: ${p.dob ?? '-'}',
                            style: const TextStyle(color: AppColors.muted, fontSize: 12),
                          ),
                          trailing: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.teal,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () => Navigator.pushNamed(context, '/triage', arguments: p),
                            child: const Text('Visit', style: TextStyle(fontSize: 12)),
                          ),
                        ),
                      )),
                  const SizedBox(height: 16),
                  const Divider(color: AppColors.line),
                  const SizedBox(height: 8),
                  const Text('Note: Tap on member to start new Visit / Triage.',
                      style: TextStyle(color: AppColors.muted, fontSize: 11)),
                ],
              );
            },
          ),
        );
      },
    );
  }
}

