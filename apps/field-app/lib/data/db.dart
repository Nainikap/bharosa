import 'dart:convert';
import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'db.g.dart';

class Households extends Table {
  TextColumn get id => text()();
  TextColumn get catchment => text()();
  TextColumn get village => text()();
  TextColumn get landmark => text().withDefault(const Constant(''))();
  TextColumn get headName => text()();
  // JSON array of members [{localId, name, dob, gender, ageMonths}]
  TextColumn get membersJson => text().withDefault(const Constant('[]'))();
  @override
  Set<Column> get primaryKey => {id};
}

class Patients extends Table {
  TextColumn get localId => text()();
  TextColumn get householdId => text().customConstraint('NOT NULL REFERENCES households(id)')();
  TextColumn get name => text()();
  TextColumn get dob => text().nullable()();
  TextColumn get gender => text().nullable()();
  TextColumn get village => text()();
  IntColumn get ageMonths => integer().nullable()();
  TextColumn get abhaRef => text().nullable()();
  @override
  Set<Column> get primaryKey => {localId};
}

class Promises extends Table {
  TextColumn get id => text()();
  TextColumn get type => text()();
  TextColumn get priority => text().withDefault(const Constant('normal'))();
  TextColumn get fromFacility => text().nullable()();
  TextColumn get fromWorker => text().nullable()();
  TextColumn get toFacility => text().nullable()();
  TextColumn get toRole => text().nullable()();
  TextColumn get descriptionJson => text().withDefault(const Constant('{}'))();
  TextColumn get createdAt => text()();
  TextColumn get slaStart => text().nullable()();
  TextColumn get deadline => text().nullable()();
  TextColumn get evidenceJson => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('open'))();
  TextColumn get ladderJson => text().withDefault(const Constant('[]'))();
  IntColumn get version => integer().withDefault(const Constant(1))();
  IntColumn get dirty => integer().withDefault(const Constant(1))();
  @override
  Set<Column> get primaryKey => {id};
}

class SyncJournals extends Table {
  TextColumn get opId => text()();
  IntColumn get seq => integer().autoIncrement()();
  TextColumn get entity => text()();
  TextColumn get payloadJson => text()();
  TextColumn get priority => text().withDefault(const Constant('referral'))();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  TextColumn get createdAt => text()();
}

@DriftDatabase(tables: [Households, Patients, Promises, SyncJournals])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  static QueryExecutor _openConnection() {
    return driftDatabase(
      name: 'bharosa_v1.db',
      native: const DriftNativeOptions(
        // sqlcipher_flutter_libs provides the native lib; fallback works on emulator
        shareAcrossIsolates: true,
      ),
    );
  }

  // Helpers
  Future<List<Household>> getAllHouseholds() => select(households).get();
  Future<Household?> getHousehold(String id) =>
      (select(households)..where((t) => t.id.equals(id))).getSingleOrNull();
  Future<List<Patient>> getPatientsForHousehold(String householdId) =>
      (select(patients)..where((t) => t.householdId.equals(householdId))).get();
  Future<List<Promise>> getAllPromises() =>
      (select(promises)..orderBy([(t) => OrderingTerm.desc(t.createdAt)])).get();
  Future<List<Promise>> getPromisesByStatus(String status) =>
      (select(promises)..where((t) => t.status.equals(status))).get();
  Future<Promise?> getPromise(String id) =>
      (select(promises)..where((t) => t.id.equals(id))).getSingleOrNull();
  Future<List<SyncJournal>> pendingOps() =>
      (select(syncJournals)..where((t) => t.status.equals('pending'))..orderBy([(t) => OrderingTerm.asc(t.seq)])).get();
}

// JSON helpers
Map<String, dynamic> decodeJson(String s) {
  try {
    return jsonDecode(s) as Map<String, dynamic>;
  } catch (_) {
    return {};
  }
}

List<dynamic> decodeJsonList(String s) {
  try {
    return jsonDecode(s) as List<dynamic>;
  } catch (_) {
    return [];
  }
}
