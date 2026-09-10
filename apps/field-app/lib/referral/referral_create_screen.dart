import 'dart:async';
import 'dart:convert';
import 'package:another_telephony/telephony.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:drift/drift.dart' as drift;
import '../data/db.dart';
import '../sync/sync_service.dart';
import '../utils/constants.dart';
import '../utils/helpers.dart';
import '../utils/sms_sender.dart';
import '../widgets/app_scaffold.dart';
import '../triage/triage_engine.dart';

class ReferralCreateScreen extends StatefulWidget {
  const ReferralCreateScreen({super.key});
  @override
  State<ReferralCreateScreen> createState() => _ReferralCreateScreenState();
}

class _ReferralCreateScreenState extends State<ReferralCreateScreen> {
  late String code;
  String facility = 'CHC Shivapur (14 km)';
  String priority = Priority.urgent;
  bool saving = false;
  bool saved = false;
  // 1-minute offline wait state — counts down while we hold the
  // referral for internet before falling back to GSM SMS.
  bool waitingForNetwork = false;
  int waitSecondsLeft = 0;
  Timer? _waitTimer;

  final facilities = [
    'CHC Shivapur (14 km)',
    'PHC Khadakwadi (6 km)',
    'DH Satara (32 km)',
    'PHC Nandgaon (9 km)',
  ];

  @override
  void initState() {
    super.initState();
    code = generateReferralCode();
  }

  @override
  void dispose() {
    _waitTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    final Patient patient = args['patient'] as Patient;
    final TriageResult result = args['result'] as TriageResult;

    // Default priority from triage result
    if (result.route == RouteDecision.redFlag) priority = Priority.redFlag;

    return AppScaffold(
      title: 'Create Referral',
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.line)),
            child: Row(children: [
              CircleAvatar(backgroundColor: AppColors.navy, child: Text(patient.name.isNotEmpty ? patient.name[0] : '?')),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(patient.name, style: const TextStyle(color: AppColors.head, fontWeight: FontWeight.w700)),
                  Text('${patient.village} · ${patient.householdId}', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                ]),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: TriageEngine.routeColor(result.route).withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                child: Text(TriageEngine.routeLabel(result.route), style: TextStyle(color: TriageEngine.routeColor(result.route), fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ]),
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: Column(children: [
              QrImageView(data: code, size: 160, backgroundColor: Colors.white),
              const SizedBox(height: 10),
              SelectableText(code, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 2, color: Colors.black)),
              const SizedBox(height: 4),
              const Text('This code/QR will scan at registration', style: TextStyle(color: Colors.black54, fontSize: 11)),
              Text('Triage triggers: ${result.triggered.join(', ')}', style: const TextStyle(color: Colors.black54, fontSize: 10), textAlign: TextAlign.center),
            ]),
          ),
          const SizedBox(height: 14),
          const Text('Destination facility', style: TextStyle(color: AppColors.head, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.line)),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: facility,
                dropdownColor: AppColors.card,
                style: const TextStyle(color: AppColors.head),
                isExpanded: true,
                items: facilities.map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
                onChanged: (v) => setState(() => facility = v!),
              ),
            ),
          ),
          const SizedBox(height: 12),
          const Text('Priority', style: TextStyle(color: AppColors.head, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Wrap(spacing: 8, children: [
            ChoiceChip(label: const Text('Routine (1 min)'), selected: priority == Priority.normal, onSelected: (_) => setState(() => priority = Priority.normal)),
            ChoiceChip(label: const Text('Urgent (1 min)'), selected: priority == Priority.urgent, onSelected: (_) => setState(() => priority = Priority.urgent)),
            ChoiceChip(label: const Text('Red-flag (1 min)'), selected: priority == Priority.redFlag, onSelected: (_) => setState(() => priority = Priority.redFlag)),
          ]),
          const SizedBox(height: 18),
          PrimaryButton(
            label: waitingForNetwork
                ? 'Waiting for internet... ${waitSecondsLeft}s'
                : (saving ? 'Sending...' : (saved ? 'Referral Sent' : 'Send referral message')),
            icon: Icons.send,
            onPressed: (saving || saved || waitingForNetwork) ? null : () => _save(patient, result),
          ),
          const SizedBox(height: 8),
          if (waitingForNetwork)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.orange.shade300),
              ),
              child: Text(
                'No internet — holding referral for 1 min. If still offline, an SMS will be sent to +91 7090562108.\n$waitSecondsLeft seconds left...',
                style: const TextStyle(color: AppColors.head, fontSize: 11, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
            ),
          const Text('Sends through the data network first. If no internet for 1 min, sends an SMS to +91 7090562108.',
              style: TextStyle(color: AppColors.muted, fontSize: 11), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Future<void> _save(Patient patient, TriageResult result) async {
    if (saving || saved) return;
    setState(() => saving = true);
    final db = Provider.of<AppDatabase>(context, listen: false);
    final sync = Provider.of<SyncService>(context, listen: false);

    final id = generateUuid();
    final now = DateTime.now().toIso8601String();

    final description = {
      'patientId': patient.localId,
      'patientName': patient.name,
      'village': patient.village,
      'householdId': patient.householdId,
      'code': code,
      'facility': facility,
      'priority': priority,
      'symptoms': result.triggered,
      'route': result.route.toString(),
      'messageRecipient': AppConfig.gatewaySmsNumber,
      'messageChannel': 'pending',
    };

    final ladder = [
      {'role': 'asha', 'workerId': 'asha_rekha'},
      {'role': 'block_mo'},
      {'role': 'district_nodal'},
    ];

    await db.into(db.promises).insert(
          PromisesCompanion.insert(
            id: id,
            type: PromiseType.referral,
            priority: drift.Value(priority),
            fromWorker: const drift.Value('asha_rekha'),
            fromFacility: drift.Value(patient.householdId),
            toFacility: drift.Value(facility),
            toRole: const drift.Value('chc'),
            descriptionJson: drift.Value(jsonEncode(description)),
            createdAt: now,
            slaStart: const drift.Value.absent(),
            // Demo SLA clock: deadline stamped at creation so the local
            // deadline check can escalate the miss (see SlaDemo)
            deadline: drift.Value(
              DateTime.now().add(SlaDemo.forPriority(priority)).toIso8601String(),
            ),
            evidenceJson: const drift.Value.absent(),
            status: const drift.Value('open'),
            ladderJson: drift.Value(jsonEncode(ladder)),
          ),
        );

    await sync.enqueue(
      entity: 'referral',
      payload: {
        'id': id,
        'type': 'referral',
        'priority': priority,
        'description': description,
        'committedBy': {
          'role': 'asha',
          'workerId': 'asha_rekha',
          'facilityId': patient.householdId,
        },
        'committedTo': {
          'role': 'facility',
          'facilityId': facility,
        },
        'independence': 'direct',
        'createdAt': now,
        'code': code,
      },
      priority: priority == Priority.redFlag ? 'emergency' : 'referral',
    );

    // Send through the data network first.
    // If there is no internet, hold for 1 min (AppConfig.offlineSmsDelay);
    // if still offline after the timelimit, fall back to GSM SMS to
    // AppConfig.gatewaySmsNumber (+91 7090562108 by default).
    String messageStatus;
    final online = await sync.hasConnectivity();
    if (online) {
      final r = await sync.drain();
      if (r.synced > 0) {
        messageStatus = 'Sent through data network';
      } else {
        messageStatus = await _waitOneMinuteThenSmsIfStillOffline(patient, result, sync);
      }
    } else {
      messageStatus = await _waitOneMinuteThenSmsIfStillOffline(patient, result, sync);
    }

    description['messageChannel'] = messageStatus;
    await (db.update(db.promises)..where((t) => t.id.equals(id))).write(
      PromisesCompanion(descriptionJson: drift.Value(jsonEncode(description))),
    );

    // Surface the SLA deadline (1 min from creation) so the ASHA can see it.
    // Use creation time `now`, not DateTime.now(), since we may have
    // waited 1 min for internet before reaching here.
    final deadlineAt =
        (DateTime.tryParse(now) ?? DateTime.now()).add(SlaDemo.forPriority(priority));
    String two(int n) => n.toString().padLeft(2, '0');
    final deadlineLabel =
        '${two(deadlineAt.hour)}:${two(deadlineAt.minute)} (SLA ${SlaDemo.forPriority(priority).inMinutes} min)';

    _waitTimer?.cancel();
    if (mounted) {
      setState(() {
        saving = false;
        saved = true;
        waitingForNetwork = false;
        waitSecondsLeft = 0;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$messageStatus · Deadline: $deadlineLabel'),
          backgroundColor: AppColors.teal,
        ),
      );
      Navigator.of(context).pushNamedAndRemoveUntil('/home', (_) => false);
    }
  }

  /// Holds the referral for [AppConfig.offlineSmsDelay] (1 min) when there
  /// is no internet. Polls every 5s — if internet returns, syncs immediately.
  /// If still offline after the timelimit, sends GSM SMS to 7090562108.
  Future<String> _waitOneMinuteThenSmsIfStillOffline(
    Patient patient,
    TriageResult result,
    SyncService sync,
  ) async {
    final totalSeconds = AppConfig.offlineSmsDelay.inSeconds;
    if (mounted) {
      setState(() {
        waitingForNetwork = true;
        waitSecondsLeft = totalSeconds;
      });
    }

    final completer = Completer<String>();
    int elapsed = 0;
    _waitTimer?.cancel();
    _waitTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      elapsed++;
      final left = totalSeconds - elapsed;
      if (mounted) {
        setState(() => waitSecondsLeft = left < 0 ? 0 : left);
      }

      // Opportunistic early-exit: every 5s retry data sync.
      if (elapsed % 5 == 0) {
        try {
          final onlineNow = await sync.hasConnectivity();
          if (onlineNow) {
            final r = await sync.drain();
            if (r.synced > 0) {
              timer.cancel();
              if (!completer.isCompleted) {
                completer.complete('Sent through data network');
              }
              return;
            }
          }
        } catch (_) {}
      }

      if (elapsed >= totalSeconds) {
        timer.cancel();
        if (!completer.isCompleted) {
          try {
            final onlineNow = await sync.hasConnectivity();
            if (onlineNow) {
              final r = await sync.drain();
              if (r.synced > 0) {
                completer.complete('Sent through data network');
                return;
              }
            }
          } catch (_) {}
          // Still no internet after 1 min → GSM SMS to 7090562108.
          final smsStatus = await _sendSmsFallback(patient, result);
          if (!completer.isCompleted) completer.complete(smsStatus);
        }
      }
    });

    final status = await completer.future;
    _waitTimer?.cancel();
    if (mounted) {
      setState(() {
        waitingForNetwork = false;
        waitSecondsLeft = 0;
      });
    }
    return status;
  }

  Future<String> _sendSmsFallback(Patient patient, TriageResult result) async {
    try {
      final telephony = Telephony.instance;
      final permitted = await telephony.requestPhoneAndSmsPermissions ?? false;
      if (!permitted) {
        return 'SMS permission was not granted. Referral is saved for sync.';
      }
      final smsResult = await sendTrackedSms(
        telephony: telephony,
        recipient: AppConfig.gatewaySmsNumber,
        message: 'BHAROSA REFERRAL: ${patient.name}, ${patient.village}; '
            'facility: $facility; symptoms: ${result.triggered.join(', ')}; code: $code.',
      );
      return smsResult.detail;
    } catch (error) {
      return 'SMS could not be submitted to ${AppConfig.gatewaySmsNumber}: $error. Referral is saved for sync.';
    }
  }
}
