import 'package:flutter/material.dart';

class AppColors {
  static const navy = Color(0xFF1E3A5F);
  static const yellow = Color(0xFFFFB300);
  static const teal = Color(0xFF2FD4BD);
  static const bg = Color(0xFFFFFFFF);
  static const card = Color(0xFFFFFFFF);
  static const line = Color(0xFF000000);
  static const head = Color(0xFF111827);
  static const muted = Color(0xFF6B7280);
  static const red = Color(0xFFFF8B98);
  static const redBg = Color(0xFFFEF3F3);
}

class AppConfig {
  // Backend — mock for v1 demo. Replace with real host when backend v1 is up.
  static const apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://bharosa-api.onrender.com/api',
  );
  // Block-office SMS gateway number for emergency bypass (plain GSM, no data needed)
  static const gatewaySmsNumber = String.fromEnvironment(
    'GATEWAY_SMS_NUMBER',
    defaultValue: '+919755760921',
  );
  // Local storage keys
  static const pinKey = 'bharosa_pin';
  static const pinSetKey = 'bharosa_pin_set';
  static const ashaNameKey = 'asha_name';
  static const notifiedEscalationsKey = 'notified_escalations';
}

// Promise model constants — mirrors backend v1 evidence-timeout table
class PromiseStatus {
  static const open = 'open';
  static const kept = 'kept';
  static const lapsed = 'lapsed';
  static const escalated = 'escalated';
  static const reconciled = 'reconciled';
  static const closedNa = 'closed_na';
}

class PromiseType {
  static const referral = 'referral';
}

class EvidenceSource {
  static const registrationMatch = 'registration_match';
  static const attestation = 'attestation';
  static const manualCode = 'manual_code';
}

class Priority {
  static const normal = 'normal';
  static const urgent = 'urgent';
  static const emergency = 'emergency';
  static const redFlag = 'red_flag';
}

// Demo SLA clocks — production durations are 7d/48h/24h, compressed to minutes
// so the offline prototype demonstrates the miss → escalate → handle loop live.
class SlaDemo {
  static const normal = Duration(minutes: 3);
  static const urgent = Duration(minutes: 2);
  static const redFlag = Duration(minutes: 1);

  static Duration forPriority(String p) {
    if (p == Priority.redFlag) return redFlag;
    if (p == Priority.urgent) return urgent;
    return normal;
  }
}
