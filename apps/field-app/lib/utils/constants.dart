import 'package:flutter/material.dart';

class AppColors {
  static const navy = Color(0xFF122C49);
  static const blue = Color(0xFF5EB0FF);
  static const teal = Color(0xFF2FD4BD);
  static const bg = Color(0xFF0A1322);
  static const card = Color(0xFF101D31);
  static const line = Color(0xFF22344C);
  static const head = Color(0xFFEAF2FB);
  static const muted = Color(0xFF8FA5BC);
  static const red = Color(0xFFFF8B98);
  static const redBg = Color(0xFF321A21);
}

class AppConfig {
  // Backend — mock for v1 demo. Replace with real host when backend v1 is up.
  static const apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'http://10.0.2.2:3000/api',
  );
  // Block-office SMS gateway number for emergency bypass (plain GSM, no data needed)
  static const gatewaySmsNumber = String.fromEnvironment(
    'GATEWAY_SMS_NUMBER',
    defaultValue: '+919999999999',
  );
  // Local storage keys
  static const pinKey = 'bharosa_pin';
  static const pinSetKey = 'bharosa_pin_set';
  static const ashaNameKey = 'asha_name';
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
