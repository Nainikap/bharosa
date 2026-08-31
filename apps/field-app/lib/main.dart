import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'data/db.dart';
import 'data/seed.dart';
import 'api/api_service.dart';
import 'sync/sync_service.dart';
import 'auth/pin_screen.dart';
import 'home/home_screen.dart';
import 'caseload/caseload_screen.dart';
import 'triage/triage_screen.dart';
import 'referral/referral_create_screen.dart';
import 'referral/referral_list_screen.dart';
import 'referral/referral_detail_screen.dart';
import 'emergency/emergency_screen.dart';
import 'notifications/notification_service.dart';
import 'notifications/escalation_monitor.dart';
import 'utils/constants.dart';

final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final db = AppDatabase();
  await seedIfEmpty(db);
  // Older referrals (created before deadline stamping) get a clock so the
  // local SLA check can escalate them too.
  await db.backfillDeadlines();
  final api = ApiService();
  final sync = SyncService(db, api);
  final notifications = NotificationService()..navigatorKey = appNavigatorKey;
  await notifications.init();
  final escalationMonitor = EscalationMonitor(db, notifications);
  runApp(BharosaApp(db: db, api: api, sync: sync, notifications: notifications, escalationMonitor: escalationMonitor));
}

class BharosaApp extends StatelessWidget {
  final AppDatabase db;
  final ApiService api;
  final SyncService sync;
  final NotificationService notifications;
  final EscalationMonitor escalationMonitor;
  const BharosaApp({super.key, required this.db, required this.api, required this.sync, required this.notifications, required this.escalationMonitor});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<AppDatabase>.value(value: db),
        Provider<ApiService>.value(value: api),
        Provider<SyncService>.value(value: sync),
        Provider<NotificationService>.value(value: notifications),
        Provider<EscalationMonitor>.value(value: escalationMonitor),
      ],
      child: MaterialApp(
        title: 'Bharosa — Closing the Care Loop',
        debugShowCheckedModeBanner: false,
        navigatorKey: appNavigatorKey,
        theme: ThemeData(
          scaffoldBackgroundColor: AppColors.bg,
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.yellow,
            brightness: Brightness.light,
            primary: AppColors.yellow,
            secondary: AppColors.teal,
            surface: AppColors.card,
            background: AppColors.bg,
            error: AppColors.red,
            onPrimary: Colors.white,
            onSurface: AppColors.head,
            onBackground: AppColors.head,
            onError: Colors.white,
            outline: AppColors.line,
          ),
          useMaterial3: true,
          appBarTheme: const AppBarTheme(backgroundColor: AppColors.navy, foregroundColor: Colors.white),
          cardTheme: CardThemeData(color: AppColors.card, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.yellow,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
        initialRoute: '/pin',
        routes: {
          '/pin': (_) => const PinScreen(),
          '/home': (_) => const HomeScreen(),
          '/caseload': (_) => const ReferralListScreen(title: 'Caseload'),
          '/newVisit': (_) => const CaseloadScreen(),
          '/household': (_) => const HouseholdDetailScreen(),
          '/triage': (_) => const TriageScreen(),
          '/referralCreate': (_) => const ReferralCreateScreen(),
          '/referrals': (_) => const ReferralListScreen(),
          '/referralDetail': (_) => const ReferralDetailScreen(),
          '/emergency': (_) => const EmergencyScreen(),
        },
      ),
    );
  }
}
