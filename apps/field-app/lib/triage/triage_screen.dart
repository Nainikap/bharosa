import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../data/db.dart';
import '../utils/constants.dart';
import '../widgets/app_scaffold.dart';
import 'triage_engine.dart';

class TriageScreen extends StatefulWidget {
  const TriageScreen({super.key});
  @override
  State<TriageScreen> createState() => _TriageScreenState();
}

class _TriageScreenState extends State<TriageScreen> {
  final FlutterTts _tts = FlutterTts();
  Set<String> selected = {};
  bool speaking = false;

  @override
  void initState() {
    super.initState();
    _tts.setLanguage('hi-IN');
    _tts.setSpeechRate(0.45);
  }

  @override
  void dispose() {
    _tts.stop();
    super.dispose();
  }

  Future<void> _speak(SymptomOption o) async {
    setState(() => speaking = true);
    await _tts.speak('${o.labelHi}. ${o.labelEn}');
    await Future.delayed(const Duration(milliseconds: 900));
    if (mounted) setState(() => speaking = false);
  }

  void _toggle(String id) {
    setState(() {
      if (selected.contains(id)) {
        selected.remove(id);
      } else {
        selected.add(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final patient = ModalRoute.of(context)!.settings.arguments as Patient;
    final result = TriageEngine.evaluate(selected);

    return AppScaffold(
      title: 'ट्राइएज — ${patient.name}',
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.all(14),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.line),
            ),
            child: Row(children: [
              CircleAvatar(backgroundColor: AppColors.navy, child: Text(patient.name.isNotEmpty ? patient.name[0] : '?')),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(patient.name, style: const TextStyle(color: AppColors.head, fontWeight: FontWeight.w700)),
                  Text('${patient.village} · ${patient.gender ?? ''} · ${patient.ageMonths ?? '-'}mo',
                      style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                ]),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: TriageEngine.routeColor(result.route).withOpacity(0.18),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: TriageEngine.routeColor(result.route)),
                ),
                child: Text(TriageEngine.routeLabel(result.route),
                    style: TextStyle(color: TriageEngine.routeColor(result.route), fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ]),
          ),
          if (result.route == RouteDecision.redFlag)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 14),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.redBg, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.red)),
              child: Row(children: [
                const Icon(Icons.warning_amber, color: AppColors.red),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(result.reason, style: const TextStyle(color: AppColors.red, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ]),
            ),
          if (result.route == RouteDecision.phcVisit)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 14),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.navy, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.blue)),
              child: Row(children: [
                const Icon(Icons.local_hospital, color: AppColors.blue, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text(result.reason, style: const TextStyle(color: AppColors.head, fontSize: 12))),
              ]),
            ),
          const SizedBox(height: 8),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(14),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 2.2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: TriageEngine.options.length,
              itemBuilder: (context, i) {
                final o = TriageEngine.options[i];
                final isSel = selected.contains(o.id);
                return InkWell(
                  onTap: () => _toggle(o.id),
                  onLongPress: () => _speak(o),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isSel ? AppColors.card : AppColors.card.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isSel ? (o.isRedFlag ? AppColors.red : AppColors.teal) : AppColors.line, width: isSel ? 1.5 : 1),
                    ),
                    child: Row(children: [
                      Icon(o.icon, size: 22, color: o.isRedFlag ? AppColors.red : (isSel ? AppColors.teal : AppColors.muted)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                          Text(o.labelHi, style: TextStyle(color: isSel ? AppColors.head : AppColors.head.withOpacity(0.9), fontSize: 12, fontWeight: FontWeight.w700)),
                          Text(o.labelEn, style: const TextStyle(color: AppColors.muted, fontSize: 10)),
                        ]),
                      ),
                      if (isSel) Icon(Icons.check_circle, size: 16, color: o.isRedFlag ? AppColors.red : AppColors.teal),
                    ]),
                  ),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
            decoration: const BoxDecoration(color: AppColors.navy, border: Border(top: BorderSide(color: AppColors.line))),
            child: Column(children: [
              Row(children: [
                const Icon(Icons.volume_up, color: AppColors.muted, size: 16),
                const SizedBox(width: 6),
                const Expanded(child: Text('लक्षण पर लॉन्ग-प्रेस = हिंदी ऑडियो', style: TextStyle(color: AppColors.muted, fontSize: 11))),
                Text('${selected.length} चुने गए', style: const TextStyle(color: AppColors.muted, fontSize: 11)),
              ]),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: TriageEngine.routeColor(result.route),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    if (result.route == RouteDecision.selfCare) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('घर पर देखभाल — फॉलो-अप शेड्यूल करें (v1 में केवल सलाह)')),
                      );
                      Navigator.pop(context);
                      return;
                    }
                    if (result.route == RouteDecision.redFlag) {
                      Navigator.pushReplacementNamed(context, '/emergency', arguments: {
                        'patient': patient,
                        'result': result,
                        'selected': selected.toList(),
                      });
                    } else {
                      Navigator.pushReplacementNamed(context, '/referralCreate', arguments: {
                        'patient': patient,
                        'result': result,
                        'selected': selected.toList(),
                      });
                    }
                  },
                  child: Text(
                    result.route == RouteDecision.redFlag
                        ? 'रेड-फ्लैग — इमरजेंसी रेफरल बनाएं'
                        : result.route == RouteDecision.phcVisit
                            ? 'PHC रेफरल बनाएं'
                            : 'आगे बढ़ें',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

