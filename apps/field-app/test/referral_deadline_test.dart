import 'dart:convert';
import 'package:drift/native.dart';
import 'package:drift/drift.dart' as drift;
import 'package:flutter_test/flutter_test.dart';
import 'package:field_app/data/db.dart';
import 'package:field_app/utils/constants.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase.forTesting(NativeDatabase.memory());
  });

  tearDown(() async {
    await db.close();
  });

  test('Referral created with 1-minute deadline stays open before deadline', () async {
    final now = DateTime.now();
    final deadline = now.add(const Duration(minutes: 1)).toIso8601String();

    await db.into(db.promises).insert(
          PromisesCompanion.insert(
            id: 'ref-001',
            type: PromiseType.referral,
            priority: const drift.Value(Priority.urgent),
            createdAt: now.toIso8601String(),
            slaStart: drift.Value(now.toIso8601String()),
            deadline: drift.Value(deadline),
            status: const drift.Value('open'),
            descriptionJson: drift.Value(jsonEncode({'reason': 'Fever'})),
          ),
        );

    final pBefore = await db.getPromise('ref-001');
    expect(pBefore, isNotNull);
    expect(pBefore!.status, 'open');
    expect(pBefore.deadline, deadline);

    final escalatedCount = await db.checkLocalDeadlines();
    expect(escalatedCount, 0);

    final pAfterCheck = await db.getPromise('ref-001');
    expect(pAfterCheck!.status, 'open');
  });

  test('Referral past 1-minute deadline is automatically escalated', () async {
    // Created 2 minutes ago -> deadline was 1 minute ago
    final past = DateTime.now().subtract(const Duration(minutes: 2));
    final expiredDeadline = past.add(const Duration(minutes: 1)).toIso8601String();

    await db.into(db.promises).insert(
          PromisesCompanion.insert(
            id: 'ref-002',
            type: PromiseType.referral,
            priority: const drift.Value(Priority.redFlag),
            createdAt: past.toIso8601String(),
            slaStart: drift.Value(past.toIso8601String()),
            deadline: drift.Value(expiredDeadline),
            status: const drift.Value('open'),
            descriptionJson: drift.Value(jsonEncode({'reason': 'Severe dehydration'})),
          ),
        );

    final escalatedCount = await db.checkLocalDeadlines();
    expect(escalatedCount, 1);

    final pAfter = await db.getPromise('ref-002');
    expect(pAfter, isNotNull);
    expect(pAfter!.status, 'escalated');
  });
}
