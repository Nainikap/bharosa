import 'dart:math';
import 'package:uuid/uuid.dart';

String generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  final r = Random.secure();
  final code = List.generate(6, (_) => chars[r.nextInt(chars.length)]).join();
  return 'REF-$code';
}

String generateUuid() => const Uuid().v4();

String formatDate(DateTime d) {
  return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
}

String formatTime(DateTime d) {
  return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
}
