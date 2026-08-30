import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../data/db.dart';
import '../auth/auth_service.dart';
import '../sync/sync_service.dart';
import '../utils/constants.dart';
import '../widgets/app_scaffold.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String ashaName = 'ASHA';
  int pendingSync = 0;
  int openReferrals = 0;
  bool syncing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = AuthService();
    final name = await auth.getAshaName();
    final db = Provider.of<AppDatabase>(context, listen: false);
    final sync = Provider.of<SyncService>(context, listen: false);
    final promises = await db.getAllPromises();
    final pending = await sync.pendingCount();
    if (!mounted) return;
    setState(() {
      ashaName = name;
      openReferrals = promises.where((p) => p.status == 'open' || p.status == 'escalated').length;
      pendingSync = pending;
    });
  }

  Future<void> _doSync() async {
    setState(() => syncing = true);
    final sync = Provider.of<SyncService>(context, listen: false);
    final res = await sync.drain();
    if (!mounted) return;
    setState(() => syncing = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(res.offline ? 'Offline — will sync later' : 'Synced: ${res.synced} sent, ${res.failed} failed'),
      backgroundColor: res.offline ? Colors.orange : AppColors.teal,
    ));
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Bharosa — $ashaName',
      actions: [
        IconButton(icon: const Icon(Icons.sync), onPressed: syncing ? null : _doSync),
        IconButton(
          icon: const Icon(Icons.logout, size: 20),
          onPressed: () async {
            // For v1 just go to PIN screen
            Navigator.pushReplacementNamed(context, '/pin');
          },
        ),
      ],
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(14),
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF0D3B66), Color(0xFF145DA0)]),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Start a visit. Assess symptoms. Close the care loop.',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                const SizedBox(height: 4),
                const Text('TRIAGE → REFERRAL → FACILITY ARRIVAL → CONFIRMATION',
                    style: TextStyle(color: Colors.white70, fontSize: 10, letterSpacing: 0.5)),
                const SizedBox(height: 10),
                Row(children: [
                  _chip('${pendingSync} pending sync', AppColors.teal),
                  const SizedBox(width: 8),
                  _chip('$openReferrals open referrals', AppColors.yellow),
                ]),
              ]),
            ),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(child: StatCard(value: '$openReferrals', label: 'Open / Escalated', color: AppColors.yellow)),
              const SizedBox(width: 10),
              Expanded(child: StatCard(value: '$pendingSync', label: 'Pending sync', color: pendingSync > 0 ? Colors.orange : AppColors.teal)),
            ]),
            const SizedBox(height: 14),
            const Text('Field work', style: TextStyle(color: AppColors.head, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            _actionCard(
              icon: Icons.medical_services_outlined,
              title: 'Start New Visit',
              subtitle: 'Choose a household member and complete IMNCI-lite triage',
              color: AppColors.yellow,
              onTap: () => Navigator.pushNamed(context, '/newVisit').then((_) => _load()),
            ),
            _actionCard(
              icon: Icons.assignment_outlined,
              title: 'Referral Caseload',
              subtitle: 'Review referred patients, facilities, status, and delivery details',
              color: AppColors.teal,
              onTap: () => Navigator.pushNamed(context, '/caseload').then((_) => _load()),
            ),
            _actionCard(
              icon: Icons.sync,
              title: syncing ? 'Syncing changes...' : 'Sync Pending Work',
              subtitle: pendingSync == 0
                  ? 'All locally saved work is up to date'
                  : '$pendingSync item${pendingSync == 1 ? '' : 's'} waiting to sync',
              color: pendingSync == 0 ? AppColors.teal : Colors.orange,
              onTap: syncing ? null : _doSync,
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.line)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Row(children: [
                  Icon(Icons.warning_amber_rounded, color: AppColors.red, size: 18),
                  SizedBox(width: 6),
                  Text('Emergency readiness', style: TextStyle(color: AppColors.head, fontWeight: FontWeight.w700, fontSize: 12)),
                ]),
                const SizedBox(height: 4),
                const Text('Red-flag symptoms in triage automatically open the emergency referral flow. If data is unavailable, the app uses SMS fallback.',
                    style: TextStyle(color: AppColors.muted, fontSize: 11)),
              ]),
            ),
            const SizedBox(height: 8),
            if (syncing) const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator())),
          ],
        ),
      ),
    );
  }

  Widget _chip(String t, Color c) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: c.withOpacity(0.2), borderRadius: BorderRadius.circular(20), border: Border.all(color: c.withOpacity(0.5))),
      child: Text(t, style: TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.w700)),
    );
  }

  Widget _actionCard({required IconData icon, required String title, required String subtitle, required Color color, required VoidCallback? onTap}) {
    return Card(
      color: AppColors.card,
      shape: RoundedRectangleBorder(side: const BorderSide(color: AppColors.line), borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
            width: 42, height: 42, decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: color)),
        title: Text(title, style: const TextStyle(color: AppColors.head, fontWeight: FontWeight.w700, fontSize: 13)),
        subtitle: Text(subtitle, style: const TextStyle(color: AppColors.muted, fontSize: 11)),
        trailing: const Icon(Icons.chevron_right, color: AppColors.muted),
        onTap: onTap,
      ),
    );
  }
}
