import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:drift/drift.dart' as drift;
import 'dart:convert';
import '../data/db.dart';
import '../sync/sync_service.dart';
import '../utils/constants.dart';
import '../utils/helpers.dart';
import '../widgets/app_scaffold.dart';
import '../triage/triage_engine.dart';
import 'package:another_telephony/telephony.dart';

class EmergencyScreen extends StatefulWidget {
  const EmergencyScreen({super.key});
  @override
  State<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends State<EmergencyScreen> {
  bool sending = false;
  String? statusMsg;
  final Telephony telephony = Telephony.instance;

  Future<void> _createAndAlert(Patient patient, TriageResult result) async {
    setState(() {
      sending = true;
      statusMsg = null;
    });
    final db = Provider.of<AppDatabase>(context, listen: false);
    final sync = Provider.of<SyncService>(context, listen: false);

    final id = generateUuid();
    final now = DateTime.now().toIso8601String();
    final code = generateReferralCode();

    final description = {
      'patientId': patient.localId,
      'patientName': patient.name,
      'village': patient.village,
      'householdId': patient.householdId,
      'code': code,
      'facility': 'CHC Shivapur (14 km)',
      'priority': Priority.redFlag,
      'symptoms': result.triggered,
      'route': 'red_flag',
    };

    await db.into(db.promises).insert(
          PromisesCompanion.insert(
            id: id,
            type: 'referral',
            priority: const drift.Value(Priority.redFlag),
            fromWorker: const drift.Value('asha_rekha'),
            fromFacility: drift.Value(patient.householdId),
            toFacility: const drift.Value('CHC Shivapur (14 km)'),
            toRole: const drift.Value('chc'),
            descriptionJson: drift.Value(jsonEncode(description)),
            createdAt: now,
            status: const drift.Value('open'),
            ladderJson: drift.Value(jsonEncode([
              {'role': 'asha', 'workerId': 'asha_rekha'},
              {'role': 'block_mo'},
              {'role': 'district_nodal'},
            ])),
          ),
        );

    await sync.enqueue(
      entity: 'referral',
      payload: {
        'id': id,
        'type': 'referral',
        'priority': Priority.redFlag,
        'description': description,
        'createdAt': now,
        'code': code,
      },
      priority: 'emergency',
    );

    // Try data sync first
    final online = await sync.hasConnectivity();
    if (online) {
      final r = await sync.drain();
      if (r.synced > 0) {
        setState(() {
          sending = false;
          statusMsg = '✓ डेटा नेटवर्क से अलर्ट भेजा गया — MO को पेज किया गया';
        });
        return;
      }
    }

    // Fallback: plain GSM SMS (no data needed)
    try {
      final hasPerm = await telephony.requestPhoneAndSmsPermissions ?? false;
      if (hasPerm) {
        final smsBody =
            'BHAROSA RED-FLAG: ${patient.name} (${patient.village}) code $code symptoms: ${result.triggered.join(', ')} — please acknowledge. ${DateTime.now().toIso8601String()}';
        await telephony.sendSms(
          to: AppConfig.gatewaySmsNumber,
          message: smsBody,
        );
        setState(() {
          sending = false;
          statusMsg = '✓ GSM SMS भेजा गया (${AppConfig.gatewaySmsNumber}) — MO को पेज किया गया';
        });
      } else {
        setState(() {
          sending = false;
          statusMsg = 'SMS अनुमति नहीं — फिर भी प्रोटोकॉल: तुरंत सुविधा ले जाएं / 108 कॉल करें';
        });
      }
    } catch (e) {
      setState(() {
        sending = false;
        statusMsg = 'SMS विफल ($e) — फिर भी प्रोटोकॉल: तुरंत सुविधा ले जाएं';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    final Patient patient = args['patient'] as Patient;
    final TriageResult result = args['result'] as TriageResult;

    return Scaffold(
      backgroundColor: const Color(0xFF1A0A0F),
      appBar: AppBar(backgroundColor: const Color(0xFF4A0A1A), foregroundColor: Colors.white, title: const Text('🚨 रेड-फ्लैग इमरजेंसी')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.redBg, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.red, width: 1.5)),
            child: Row(children: [
              const Icon(Icons.warning_amber_rounded, color: AppColors.red, size: 28),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(patient.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                  Text('${patient.village} · Household ${patient.householdId}', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text('Triggers: ${result.triggered.join(', ')}', style: const TextStyle(color: AppColors.red, fontSize: 11, fontWeight: FontWeight.w600)),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
            child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('प्रोटोकॉल — यह ऐप पर निर्भर नहीं है', style: TextStyle(fontWeight: FontWeight.w800, color: Colors.black)),
              SizedBox(height: 6),
              Text('1. मरीज को तुरंत नजदीकी सुविधा ले जाएं\n2. 108 पर कॉल करें\n3. परिवार को साथ रखें\n4. यह अलर्ट केवल सूचनात्मक है', style: TextStyle(color: Colors.black87, fontSize: 12)),
            ]),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: sending ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.sms),
              label: Text(sending ? 'भेजा जा रहा है...' : 'इमरजेंसी अलर्ट भेजें (GSM SMS)'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.red,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: sending ? null : () => _createAndAlert(patient, result),
            ),
          ),
          if (statusMsg != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.teal)),
              child: Text(statusMsg!, style: const TextStyle(color: AppColors.teal, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ],
          const SizedBox(height: 14),
          OutlinedButton(
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.muted, side: const BorderSide(color: AppColors.line)),
            onPressed: () => Navigator.popUntil(context, (r) => r.isFirst),
            child: const Text('होम पर लौटें'),
          ),
          const SizedBox(height: 8),
          const Text('नोट: डेटा न होने पर भी यह GSM SMS सीधे ब्लॉक-ऑफिस गेटवे फोन पर जाता है। ऑफलाइन बनाया गया वादा dual-clock से insta-lapse नहीं होता।',
              style: TextStyle(color: AppColors.muted, fontSize: 10), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
