import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/drift.dart';
import '../data/db.dart';
import '../api/api_service.dart';
import '../utils/helpers.dart';

class SyncService {
  final AppDatabase db;
  final ApiService api;

  SyncService(this.db, this.api);

  Future<bool> hasConnectivity() async {
    final res = await Connectivity().checkConnectivity();
    return res.any((r) => r != ConnectivityResult.none);
  }

  Future<void> enqueue({
    required String entity,
    required Map<String, dynamic> payload,
    required String priority,
  }) async {
    final opId = generateUuid();
    await db.into(db.syncJournals).insert(
          SyncJournalsCompanion.insert(
            opId: opId,
            entity: entity,
            payloadJson: jsonEncode(payload),
            priority: Value(priority),
            status: const Value('pending'),
            createdAt: DateTime.now().toIso8601String(),
          ),
        );
  }

  Future<int> pendingCount() async {
    final q = await db.pendingOps();
    return q.length;
  }

  // Attempt to drain queue in priority order: emergency > referral > analytics
  Future<SyncResult> drain() async {
    final online = await hasConnectivity();
    if (!online) return SyncResult(offline: true, synced: 0, failed: 0);

    final ops = await db.pendingOps();
    if (ops.isEmpty) return SyncResult(offline: false, synced: 0, failed: 0);

    ops.sort((a, b) {
      int p(String s) {
        if (s == 'emergency') return 0;
        if (s == 'referral') return 1;
        return 2;
      }

      return p(a.priority).compareTo(p(b.priority));
    });

    int synced = 0;
    int failed = 0;

    // Translate field-app journal format to backend-expected format:
    // Backend expects: { table, op, rowId, data, priority }
    // Field app stores: { entity, payloadJson, priority }
    final payloads = ops.map((e) {
      final payload = jsonDecode(e.payloadJson) as Map<String, dynamic>;
      final entity = e.entity;

      // Map entity names to backend table names
      String table;
      String op;
      if (entity == 'referral' || entity == 'promise') {
        table = 'promise';
        op = 'insert';
      } else if (entity == 'referral_update' || entity == 'promise_update') {
        table = 'promise';
        op = 'update';
      } else {
        table = entity;
        op = 'insert';
      }

      final rowId = payload['id'] as String? ?? generateUuid();

      return {
        'table': table,
        'op': op,
        'rowId': rowId,
        'data': payload,
        'priority': e.priority,
      };
    }).toList();

    final res = await api.pushSync(payloads);
    if (res != null) {
      // Assume server acked all; mark pending -> synced (delete or mark done)
      for (final o in ops) {
        await (db.update(db.syncJournals)..where((t) => t.opId.equals(o.opId)))
            .write(const SyncJournalsCompanion(status: Value('synced')));
        // Stamp slaStart on promise if referral
        try {
          final payload = jsonDecode(o.payloadJson) as Map<String, dynamic>;
          final promiseId = payload['id'] as String?;
          if (promiseId != null) {
            final now = DateTime.now().toIso8601String();
            await (db.update(db.promises)..where((t) => t.id.equals(promiseId)))
                .write(PromisesCompanion(slaStart: Value(now)));
          }
        } catch (_) {}
      }
      synced = ops.length;
    } else {
      // Try individual referral posts as fallback
      for (final o in ops) {
        if (o.entity == 'referral') {
          try {
            final payload = jsonDecode(o.payloadJson) as Map<String, dynamic>;
            final ok = await api.createReferral(payload);
            if (ok) {
              await (db.update(db.syncJournals)..where((t) => t.opId.equals(o.opId)))
                  .write(const SyncJournalsCompanion(status: Value('synced')));
              synced++;
              // stamp slaStart
              final promiseId = payload['id'] as String?;
              if (promiseId != null) {
                final now = DateTime.now().toIso8601String();
                await (db.update(db.promises)..where((t) => t.id.equals(promiseId)))
                    .write(PromisesCompanion(slaStart: Value(now)));
              }
            } else {
              failed++;
            }
          } catch (_) {
            failed++;
          }
        } else {
          failed++;
        }
      }
    }

    return SyncResult(offline: false, synced: synced, failed: failed);
  }
}

class SyncResult {
  final bool offline;
  final int synced;
  final int failed;
  SyncResult({required this.offline, required this.synced, required this.failed});
}
