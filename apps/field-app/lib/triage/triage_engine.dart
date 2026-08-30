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
    SymptomOption('fever', 'Fever', 'Fever', Icons.thermostat, false, 'general'),
    SymptomOption('cough', 'Cough', 'Cough', Icons.air, false, 'child'),
    SymptomOption('fast_breathing', 'Fast breathing', 'Fast breathing', Icons.air, true, 'child'),
    SymptomOption('diarrhea', 'Diarrhea', 'Diarrhea', Icons.water_drop, false, 'child'),
    SymptomOption('vomiting', 'Vomiting', 'Vomiting', Icons.sick, false, 'general'),
    SymptomOption('swelling', 'Swelling (face/hands)', 'Swelling (face/hands)', Icons.accessibility_new, true, 'maternal'),
    SymptomOption('high_bp', 'High BP / headache', 'High BP / headache', Icons.monitor_heart, true, 'maternal'),
    SymptomOption('bleeding', 'Bleeding', 'Bleeding', Icons.bloodtype, true, 'maternal'),
    SymptomOption('no_movement', 'No fetal movement', 'No fetal movement', Icons.child_care, true, 'maternal'),
    SymptomOption('chest_indrawing', 'Chest indrawing', 'Chest indrawing', Icons.air, true, 'child'),
    SymptomOption('lethargy', 'Lethargy / unconscious', 'Lethargy / unconscious', Icons.bedtime, true, 'general'),
    SymptomOption('convulsion', 'Convulsion', 'Convulsion', Icons.warning_amber, true, 'general'),
  ];

  static TriageResult evaluate(Set<String> selectedIds) {
    final selected = options.where((o) => selectedIds.contains(o.id)).toList();
    final redFlags = selected.where((o) => o.isRedFlag).toList();

    if (redFlags.isNotEmpty) {
      return TriageResult(
        RouteDecision.redFlag,
        'Red-flag — immediate referral + emergency alert',
        redFlags.map((e) => e.labelEn).toList(),
      );
    }

    // Any maternal/child moderate sign -> PHC visit in v1 (teleconsult is v2)
    if (selected.isNotEmpty) {
      // If only mild general signs, still PHC visit for prototype simplicity
      // Teleconsult route reserved for v2 consult promise
      return TriageResult(
        RouteDecision.phcVisit,
        'PHC/CHC referral required',
        selected.map((e) => e.labelEn).toList(),
      );
    }

    return TriageResult(RouteDecision.selfCare, 'Home care + follow-up', []);
  }

static String routeLabel(RouteDecision r) {
    switch (r) {
      case RouteDecision.selfCare:
        return 'Home care';
      case RouteDecision.phcVisit:
        return 'PHC/CHC referral';
      case RouteDecision.teleconsult:
        return 'Teleconsult (v2)';
      case RouteDecision.redFlag:
        return 'Red-flag emergency';
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
