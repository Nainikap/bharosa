import 'package:flutter/material.dart';

enum RouteDecision { selfCare, phcVisit, teleconsult, redFlag }

class TriageResult {
  final RouteDecision route;
  final String reason;
  final List<String> triggered;
  TriageResult(this.route, this.reason, this.triggered);
}

class SymptomOption {
  final String id;
  final String labelHi;
  final String labelEn;
  final IconData icon;
  final bool isRedFlag;
  final String group; // maternal, child, general
  SymptomOption(this.id, this.labelHi, this.labelEn, this.icon, this.isRedFlag, this.group);
}

// Minimal IMNCI-lite rule bundle — v1 covers maternal + child general danger signs
class TriageEngine {
  static final List<SymptomOption> options = [
    SymptomOption('fever', 'बुखार', 'Fever', Icons.thermostat, false, 'general'),
    SymptomOption('cough', 'खांसी', 'Cough', Icons.air, false, 'child'),
    SymptomOption('fast_breathing', 'तेज़ साँस', 'Fast breathing', Icons.air, true, 'child'),
    SymptomOption('diarrhea', 'दस्त', 'Diarrhea', Icons.water_drop, false, 'child'),
    SymptomOption('vomiting', 'उल्टी', 'Vomiting', Icons.sick, false, 'general'),
    SymptomOption('swelling', 'सूजन', 'Swelling (face/hands)', Icons.accessibility_new, true, 'maternal'),
    SymptomOption('high_bp', 'BP 140+ / सिरदर्द', 'High BP / headache', Icons.monitor_heart, true, 'maternal'),
    SymptomOption('bleeding', 'रक्तस्राव', 'Bleeding', Icons.bloodtype, true, 'maternal'),
    SymptomOption('no_movement', 'बच्चे की हलचल नहीं', 'No fetal movement', Icons.child_care, true, 'maternal'),
    SymptomOption('chest_indrawing', 'छाती अंदर धँसना', 'Chest indrawing', Icons.air, true, 'child'),
    SymptomOption('lethargy', 'सुस्ती / बेहोशी', 'Lethargy / unconscious', Icons.bedtime, true, 'general'),
    SymptomOption('convulsion', 'दौरा / झटके', 'Convulsion', Icons.warning_amber, true, 'general'),
  ];

  static TriageResult evaluate(Set<String> selectedIds) {
    final selected = options.where((o) => selectedIds.contains(o.id)).toList();
    final redFlags = selected.where((o) => o.isRedFlag).toList();

    if (redFlags.isNotEmpty) {
      return TriageResult(
        RouteDecision.redFlag,
        'लाल निशान — तुरंत रेफरल + इमरजेंसी अलर्ट',
        redFlags.map((e) => e.labelEn).toList(),
      );
    }

    // Any maternal/child moderate sign -> PHC visit in v1 (teleconsult is v2)
    if (selected.isNotEmpty) {
      // If only mild general signs, still PHC visit for prototype simplicity
      // Teleconsult route reserved for v2 consult promise
      return TriageResult(
        RouteDecision.phcVisit,
        'पीएचसी/सीएचसी रेफरल आवश्यक',
        selected.map((e) => e.labelEn).toList(),
      );
    }

    return TriageResult(RouteDecision.selfCare, 'घर पर देखभाल + फॉलो-अप', []);
  }

  static String routeLabel(RouteDecision r) {
    switch (r) {
      case RouteDecision.selfCare:
        return 'घर पर देखभाल';
      case RouteDecision.phcVisit:
        return 'PHC/CHC रेफरल';
      case RouteDecision.teleconsult:
        return 'टेली-परामर्श (v2)';
      case RouteDecision.redFlag:
        return 'रेड-फ्लैग इमरजेंसी';
    }
  }

  static Color routeColor(RouteDecision r) {
    switch (r) {
      case RouteDecision.selfCare:
        return const Color(0xFF2FD4BD);
      case RouteDecision.phcVisit:
        return const Color(0xFF5EB0FF);
      case RouteDecision.teleconsult:
        return const Color(0xFFB388FF);
      case RouteDecision.redFlag:
        return const Color(0xFFFF8B98);
    }
  }
}
