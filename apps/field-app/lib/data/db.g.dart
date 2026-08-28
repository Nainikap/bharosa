// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'db.dart';

// ignore_for_file: type=lint
class $HouseholdsTable extends Households
    with TableInfo<$HouseholdsTable, Household> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $HouseholdsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _catchmentMeta = const VerificationMeta(
    'catchment',
  );
  @override
  late final GeneratedColumn<String> catchment = GeneratedColumn<String>(
    'catchment',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _villageMeta = const VerificationMeta(
    'village',
  );
  @override
  late final GeneratedColumn<String> village = GeneratedColumn<String>(
    'village',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _landmarkMeta = const VerificationMeta(
    'landmark',
  );
  @override
  late final GeneratedColumn<String> landmark = GeneratedColumn<String>(
    'landmark',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant(''),
  );
  static const VerificationMeta _headNameMeta = const VerificationMeta(
    'headName',
  );
  @override
  late final GeneratedColumn<String> headName = GeneratedColumn<String>(
    'head_name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _membersJsonMeta = const VerificationMeta(
    'membersJson',
  );
  @override
  late final GeneratedColumn<String> membersJson = GeneratedColumn<String>(
    'members_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('[]'),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    catchment,
    village,
    landmark,
    headName,
    membersJson,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'households';
  @override
  VerificationContext validateIntegrity(
    Insertable<Household> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('catchment')) {
      context.handle(
        _catchmentMeta,
        catchment.isAcceptableOrUnknown(data['catchment']!, _catchmentMeta),
      );
    } else if (isInserting) {
      context.missing(_catchmentMeta);
    }
    if (data.containsKey('village')) {
      context.handle(
        _villageMeta,
        village.isAcceptableOrUnknown(data['village']!, _villageMeta),
      );
    } else if (isInserting) {
      context.missing(_villageMeta);
    }
    if (data.containsKey('landmark')) {
      context.handle(
        _landmarkMeta,
        landmark.isAcceptableOrUnknown(data['landmark']!, _landmarkMeta),
      );
    }
    if (data.containsKey('head_name')) {
      context.handle(
        _headNameMeta,
        headName.isAcceptableOrUnknown(data['head_name']!, _headNameMeta),
      );
    } else if (isInserting) {
      context.missing(_headNameMeta);
    }
    if (data.containsKey('members_json')) {
      context.handle(
        _membersJsonMeta,
        membersJson.isAcceptableOrUnknown(
          data['members_json']!,
          _membersJsonMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Household map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Household(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      catchment: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}catchment'],
      )!,
      village: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}village'],
      )!,
      landmark: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}landmark'],
      )!,
      headName: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}head_name'],
      )!,
      membersJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}members_json'],
      )!,
    );
  }

  @override
  $HouseholdsTable createAlias(String alias) {
    return $HouseholdsTable(attachedDatabase, alias);
  }
}

class Household extends DataClass implements Insertable<Household> {
  final String id;
  final String catchment;
  final String village;
  final String landmark;
  final String headName;
  final String membersJson;
  const Household({
    required this.id,
    required this.catchment,
    required this.village,
    required this.landmark,
    required this.headName,
    required this.membersJson,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['catchment'] = Variable<String>(catchment);
    map['village'] = Variable<String>(village);
    map['landmark'] = Variable<String>(landmark);
    map['head_name'] = Variable<String>(headName);
    map['members_json'] = Variable<String>(membersJson);
    return map;
  }

  HouseholdsCompanion toCompanion(bool nullToAbsent) {
    return HouseholdsCompanion(
      id: Value(id),
      catchment: Value(catchment),
      village: Value(village),
      landmark: Value(landmark),
      headName: Value(headName),
      membersJson: Value(membersJson),
    );
  }

  factory Household.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Household(
      id: serializer.fromJson<String>(json['id']),
      catchment: serializer.fromJson<String>(json['catchment']),
      village: serializer.fromJson<String>(json['village']),
      landmark: serializer.fromJson<String>(json['landmark']),
      headName: serializer.fromJson<String>(json['headName']),
      membersJson: serializer.fromJson<String>(json['membersJson']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'catchment': serializer.toJson<String>(catchment),
      'village': serializer.toJson<String>(village),
      'landmark': serializer.toJson<String>(landmark),
      'headName': serializer.toJson<String>(headName),
      'membersJson': serializer.toJson<String>(membersJson),
    };
  }

  Household copyWith({
    String? id,
    String? catchment,
    String? village,
    String? landmark,
    String? headName,
    String? membersJson,
  }) => Household(
    id: id ?? this.id,
    catchment: catchment ?? this.catchment,
    village: village ?? this.village,
    landmark: landmark ?? this.landmark,
    headName: headName ?? this.headName,
    membersJson: membersJson ?? this.membersJson,
  );
  Household copyWithCompanion(HouseholdsCompanion data) {
    return Household(
      id: data.id.present ? data.id.value : this.id,
      catchment: data.catchment.present ? data.catchment.value : this.catchment,
      village: data.village.present ? data.village.value : this.village,
      landmark: data.landmark.present ? data.landmark.value : this.landmark,
      headName: data.headName.present ? data.headName.value : this.headName,
      membersJson: data.membersJson.present
          ? data.membersJson.value
          : this.membersJson,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Household(')
          ..write('id: $id, ')
          ..write('catchment: $catchment, ')
          ..write('village: $village, ')
          ..write('landmark: $landmark, ')
          ..write('headName: $headName, ')
          ..write('membersJson: $membersJson')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, catchment, village, landmark, headName, membersJson);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Household &&
          other.id == this.id &&
          other.catchment == this.catchment &&
          other.village == this.village &&
          other.landmark == this.landmark &&
          other.headName == this.headName &&
          other.membersJson == this.membersJson);
}

class HouseholdsCompanion extends UpdateCompanion<Household> {
  final Value<String> id;
  final Value<String> catchment;
  final Value<String> village;
  final Value<String> landmark;
  final Value<String> headName;
  final Value<String> membersJson;
  final Value<int> rowid;
  const HouseholdsCompanion({
    this.id = const Value.absent(),
    this.catchment = const Value.absent(),
    this.village = const Value.absent(),
    this.landmark = const Value.absent(),
    this.headName = const Value.absent(),
    this.membersJson = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  HouseholdsCompanion.insert({
    required String id,
    required String catchment,
    required String village,
    this.landmark = const Value.absent(),
    required String headName,
    this.membersJson = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       catchment = Value(catchment),
       village = Value(village),
       headName = Value(headName);
  static Insertable<Household> custom({
    Expression<String>? id,
    Expression<String>? catchment,
    Expression<String>? village,
    Expression<String>? landmark,
    Expression<String>? headName,
    Expression<String>? membersJson,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (catchment != null) 'catchment': catchment,
      if (village != null) 'village': village,
      if (landmark != null) 'landmark': landmark,
      if (headName != null) 'head_name': headName,
      if (membersJson != null) 'members_json': membersJson,
      if (rowid != null) 'rowid': rowid,
    });
  }

  HouseholdsCompanion copyWith({
    Value<String>? id,
    Value<String>? catchment,
    Value<String>? village,
    Value<String>? landmark,
    Value<String>? headName,
    Value<String>? membersJson,
    Value<int>? rowid,
  }) {
    return HouseholdsCompanion(
      id: id ?? this.id,
      catchment: catchment ?? this.catchment,
      village: village ?? this.village,
      landmark: landmark ?? this.landmark,
      headName: headName ?? this.headName,
      membersJson: membersJson ?? this.membersJson,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (catchment.present) {
      map['catchment'] = Variable<String>(catchment.value);
    }
    if (village.present) {
      map['village'] = Variable<String>(village.value);
    }
    if (landmark.present) {
      map['landmark'] = Variable<String>(landmark.value);
    }
    if (headName.present) {
      map['head_name'] = Variable<String>(headName.value);
    }
    if (membersJson.present) {
      map['members_json'] = Variable<String>(membersJson.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('HouseholdsCompanion(')
          ..write('id: $id, ')
          ..write('catchment: $catchment, ')
          ..write('village: $village, ')
          ..write('landmark: $landmark, ')
          ..write('headName: $headName, ')
          ..write('membersJson: $membersJson, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $PatientsTable extends Patients with TableInfo<$PatientsTable, Patient> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PatientsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _localIdMeta = const VerificationMeta(
    'localId',
  );
  @override
  late final GeneratedColumn<String> localId = GeneratedColumn<String>(
    'local_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _householdIdMeta = const VerificationMeta(
    'householdId',
  );
  @override
  late final GeneratedColumn<String> householdId = GeneratedColumn<String>(
    'household_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
    $customConstraints: 'NOT NULL REFERENCES households(id)',
  );
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
    'name',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _dobMeta = const VerificationMeta('dob');
  @override
  late final GeneratedColumn<String> dob = GeneratedColumn<String>(
    'dob',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _genderMeta = const VerificationMeta('gender');
  @override
  late final GeneratedColumn<String> gender = GeneratedColumn<String>(
    'gender',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _villageMeta = const VerificationMeta(
    'village',
  );
  @override
  late final GeneratedColumn<String> village = GeneratedColumn<String>(
    'village',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ageMonthsMeta = const VerificationMeta(
    'ageMonths',
  );
  @override
  late final GeneratedColumn<int> ageMonths = GeneratedColumn<int>(
    'age_months',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _abhaRefMeta = const VerificationMeta(
    'abhaRef',
  );
  @override
  late final GeneratedColumn<String> abhaRef = GeneratedColumn<String>(
    'abha_ref',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    localId,
    householdId,
    name,
    dob,
    gender,
    village,
    ageMonths,
    abhaRef,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'patients';
  @override
  VerificationContext validateIntegrity(
    Insertable<Patient> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('local_id')) {
      context.handle(
        _localIdMeta,
        localId.isAcceptableOrUnknown(data['local_id']!, _localIdMeta),
      );
    } else if (isInserting) {
      context.missing(_localIdMeta);
    }
    if (data.containsKey('household_id')) {
      context.handle(
        _householdIdMeta,
        householdId.isAcceptableOrUnknown(
          data['household_id']!,
          _householdIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_householdIdMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
        _nameMeta,
        name.isAcceptableOrUnknown(data['name']!, _nameMeta),
      );
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('dob')) {
      context.handle(
        _dobMeta,
        dob.isAcceptableOrUnknown(data['dob']!, _dobMeta),
      );
    }
    if (data.containsKey('gender')) {
      context.handle(
        _genderMeta,
        gender.isAcceptableOrUnknown(data['gender']!, _genderMeta),
      );
    }
    if (data.containsKey('village')) {
      context.handle(
        _villageMeta,
        village.isAcceptableOrUnknown(data['village']!, _villageMeta),
      );
    } else if (isInserting) {
      context.missing(_villageMeta);
    }
    if (data.containsKey('age_months')) {
      context.handle(
        _ageMonthsMeta,
        ageMonths.isAcceptableOrUnknown(data['age_months']!, _ageMonthsMeta),
      );
    }
    if (data.containsKey('abha_ref')) {
      context.handle(
        _abhaRefMeta,
        abhaRef.isAcceptableOrUnknown(data['abha_ref']!, _abhaRefMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {localId};
  @override
  Patient map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Patient(
      localId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}local_id'],
      )!,
      householdId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}household_id'],
      )!,
      name: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}name'],
      )!,
      dob: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}dob'],
      ),
      gender: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}gender'],
      ),
      village: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}village'],
      )!,
      ageMonths: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}age_months'],
      ),
      abhaRef: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}abha_ref'],
      ),
    );
  }

  @override
  $PatientsTable createAlias(String alias) {
    return $PatientsTable(attachedDatabase, alias);
  }
}

class Patient extends DataClass implements Insertable<Patient> {
  final String localId;
  final String householdId;
  final String name;
  final String? dob;
  final String? gender;
  final String village;
  final int? ageMonths;
  final String? abhaRef;
  const Patient({
    required this.localId,
    required this.householdId,
    required this.name,
    this.dob,
    this.gender,
    required this.village,
    this.ageMonths,
    this.abhaRef,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['local_id'] = Variable<String>(localId);
    map['household_id'] = Variable<String>(householdId);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || dob != null) {
      map['dob'] = Variable<String>(dob);
    }
    if (!nullToAbsent || gender != null) {
      map['gender'] = Variable<String>(gender);
    }
    map['village'] = Variable<String>(village);
    if (!nullToAbsent || ageMonths != null) {
      map['age_months'] = Variable<int>(ageMonths);
    }
    if (!nullToAbsent || abhaRef != null) {
      map['abha_ref'] = Variable<String>(abhaRef);
    }
    return map;
  }

  PatientsCompanion toCompanion(bool nullToAbsent) {
    return PatientsCompanion(
      localId: Value(localId),
      householdId: Value(householdId),
      name: Value(name),
      dob: dob == null && nullToAbsent ? const Value.absent() : Value(dob),
      gender: gender == null && nullToAbsent
          ? const Value.absent()
          : Value(gender),
      village: Value(village),
      ageMonths: ageMonths == null && nullToAbsent
          ? const Value.absent()
          : Value(ageMonths),
      abhaRef: abhaRef == null && nullToAbsent
          ? const Value.absent()
          : Value(abhaRef),
    );
  }

  factory Patient.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Patient(
      localId: serializer.fromJson<String>(json['localId']),
      householdId: serializer.fromJson<String>(json['householdId']),
      name: serializer.fromJson<String>(json['name']),
      dob: serializer.fromJson<String?>(json['dob']),
      gender: serializer.fromJson<String?>(json['gender']),
      village: serializer.fromJson<String>(json['village']),
      ageMonths: serializer.fromJson<int?>(json['ageMonths']),
      abhaRef: serializer.fromJson<String?>(json['abhaRef']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'localId': serializer.toJson<String>(localId),
      'householdId': serializer.toJson<String>(householdId),
      'name': serializer.toJson<String>(name),
      'dob': serializer.toJson<String?>(dob),
      'gender': serializer.toJson<String?>(gender),
      'village': serializer.toJson<String>(village),
      'ageMonths': serializer.toJson<int?>(ageMonths),
      'abhaRef': serializer.toJson<String?>(abhaRef),
    };
  }

  Patient copyWith({
    String? localId,
    String? householdId,
    String? name,
    Value<String?> dob = const Value.absent(),
    Value<String?> gender = const Value.absent(),
    String? village,
    Value<int?> ageMonths = const Value.absent(),
    Value<String?> abhaRef = const Value.absent(),
  }) => Patient(
    localId: localId ?? this.localId,
    householdId: householdId ?? this.householdId,
    name: name ?? this.name,
    dob: dob.present ? dob.value : this.dob,
    gender: gender.present ? gender.value : this.gender,
    village: village ?? this.village,
    ageMonths: ageMonths.present ? ageMonths.value : this.ageMonths,
    abhaRef: abhaRef.present ? abhaRef.value : this.abhaRef,
  );
  Patient copyWithCompanion(PatientsCompanion data) {
    return Patient(
      localId: data.localId.present ? data.localId.value : this.localId,
      householdId: data.householdId.present
          ? data.householdId.value
          : this.householdId,
      name: data.name.present ? data.name.value : this.name,
      dob: data.dob.present ? data.dob.value : this.dob,
      gender: data.gender.present ? data.gender.value : this.gender,
      village: data.village.present ? data.village.value : this.village,
      ageMonths: data.ageMonths.present ? data.ageMonths.value : this.ageMonths,
      abhaRef: data.abhaRef.present ? data.abhaRef.value : this.abhaRef,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Patient(')
          ..write('localId: $localId, ')
          ..write('householdId: $householdId, ')
          ..write('name: $name, ')
          ..write('dob: $dob, ')
          ..write('gender: $gender, ')
          ..write('village: $village, ')
          ..write('ageMonths: $ageMonths, ')
          ..write('abhaRef: $abhaRef')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    localId,
    householdId,
    name,
    dob,
    gender,
    village,
    ageMonths,
    abhaRef,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Patient &&
          other.localId == this.localId &&
          other.householdId == this.householdId &&
          other.name == this.name &&
          other.dob == this.dob &&
          other.gender == this.gender &&
          other.village == this.village &&
          other.ageMonths == this.ageMonths &&
          other.abhaRef == this.abhaRef);
}

class PatientsCompanion extends UpdateCompanion<Patient> {
  final Value<String> localId;
  final Value<String> householdId;
  final Value<String> name;
  final Value<String?> dob;
  final Value<String?> gender;
  final Value<String> village;
  final Value<int?> ageMonths;
  final Value<String?> abhaRef;
  final Value<int> rowid;
  const PatientsCompanion({
    this.localId = const Value.absent(),
    this.householdId = const Value.absent(),
    this.name = const Value.absent(),
    this.dob = const Value.absent(),
    this.gender = const Value.absent(),
    this.village = const Value.absent(),
    this.ageMonths = const Value.absent(),
    this.abhaRef = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PatientsCompanion.insert({
    required String localId,
    required String householdId,
    required String name,
    this.dob = const Value.absent(),
    this.gender = const Value.absent(),
    required String village,
    this.ageMonths = const Value.absent(),
    this.abhaRef = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : localId = Value(localId),
       householdId = Value(householdId),
       name = Value(name),
       village = Value(village);
  static Insertable<Patient> custom({
    Expression<String>? localId,
    Expression<String>? householdId,
    Expression<String>? name,
    Expression<String>? dob,
    Expression<String>? gender,
    Expression<String>? village,
    Expression<int>? ageMonths,
    Expression<String>? abhaRef,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (localId != null) 'local_id': localId,
      if (householdId != null) 'household_id': householdId,
      if (name != null) 'name': name,
      if (dob != null) 'dob': dob,
      if (gender != null) 'gender': gender,
      if (village != null) 'village': village,
      if (ageMonths != null) 'age_months': ageMonths,
      if (abhaRef != null) 'abha_ref': abhaRef,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PatientsCompanion copyWith({
    Value<String>? localId,
    Value<String>? householdId,
    Value<String>? name,
    Value<String?>? dob,
    Value<String?>? gender,
    Value<String>? village,
    Value<int?>? ageMonths,
    Value<String?>? abhaRef,
    Value<int>? rowid,
  }) {
    return PatientsCompanion(
      localId: localId ?? this.localId,
      householdId: householdId ?? this.householdId,
      name: name ?? this.name,
      dob: dob ?? this.dob,
      gender: gender ?? this.gender,
      village: village ?? this.village,
      ageMonths: ageMonths ?? this.ageMonths,
      abhaRef: abhaRef ?? this.abhaRef,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (localId.present) {
      map['local_id'] = Variable<String>(localId.value);
    }
    if (householdId.present) {
      map['household_id'] = Variable<String>(householdId.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (dob.present) {
      map['dob'] = Variable<String>(dob.value);
    }
    if (gender.present) {
      map['gender'] = Variable<String>(gender.value);
    }
    if (village.present) {
      map['village'] = Variable<String>(village.value);
    }
    if (ageMonths.present) {
      map['age_months'] = Variable<int>(ageMonths.value);
    }
    if (abhaRef.present) {
      map['abha_ref'] = Variable<String>(abhaRef.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PatientsCompanion(')
          ..write('localId: $localId, ')
          ..write('householdId: $householdId, ')
          ..write('name: $name, ')
          ..write('dob: $dob, ')
          ..write('gender: $gender, ')
          ..write('village: $village, ')
          ..write('ageMonths: $ageMonths, ')
          ..write('abhaRef: $abhaRef, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $PromisesTable extends Promises with TableInfo<$PromisesTable, Promise> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PromisesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _typeMeta = const VerificationMeta('type');
  @override
  late final GeneratedColumn<String> type = GeneratedColumn<String>(
    'type',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _priorityMeta = const VerificationMeta(
    'priority',
  );
  @override
  late final GeneratedColumn<String> priority = GeneratedColumn<String>(
    'priority',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('normal'),
  );
  static const VerificationMeta _fromFacilityMeta = const VerificationMeta(
    'fromFacility',
  );
  @override
  late final GeneratedColumn<String> fromFacility = GeneratedColumn<String>(
    'from_facility',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fromWorkerMeta = const VerificationMeta(
    'fromWorker',
  );
  @override
  late final GeneratedColumn<String> fromWorker = GeneratedColumn<String>(
    'from_worker',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _toFacilityMeta = const VerificationMeta(
    'toFacility',
  );
  @override
  late final GeneratedColumn<String> toFacility = GeneratedColumn<String>(
    'to_facility',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _toRoleMeta = const VerificationMeta('toRole');
  @override
  late final GeneratedColumn<String> toRole = GeneratedColumn<String>(
    'to_role',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _descriptionJsonMeta = const VerificationMeta(
    'descriptionJson',
  );
  @override
  late final GeneratedColumn<String> descriptionJson = GeneratedColumn<String>(
    'description_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('{}'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _slaStartMeta = const VerificationMeta(
    'slaStart',
  );
  @override
  late final GeneratedColumn<String> slaStart = GeneratedColumn<String>(
    'sla_start',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _deadlineMeta = const VerificationMeta(
    'deadline',
  );
  @override
  late final GeneratedColumn<String> deadline = GeneratedColumn<String>(
    'deadline',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _evidenceJsonMeta = const VerificationMeta(
    'evidenceJson',
  );
  @override
  late final GeneratedColumn<String> evidenceJson = GeneratedColumn<String>(
    'evidence_json',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('open'),
  );
  static const VerificationMeta _ladderJsonMeta = const VerificationMeta(
    'ladderJson',
  );
  @override
  late final GeneratedColumn<String> ladderJson = GeneratedColumn<String>(
    'ladder_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('[]'),
  );
  static const VerificationMeta _versionMeta = const VerificationMeta(
    'version',
  );
  @override
  late final GeneratedColumn<int> version = GeneratedColumn<int>(
    'version',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _dirtyMeta = const VerificationMeta('dirty');
  @override
  late final GeneratedColumn<int> dirty = GeneratedColumn<int>(
    'dirty',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    type,
    priority,
    fromFacility,
    fromWorker,
    toFacility,
    toRole,
    descriptionJson,
    createdAt,
    slaStart,
    deadline,
    evidenceJson,
    status,
    ladderJson,
    version,
    dirty,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'promises';
  @override
  VerificationContext validateIntegrity(
    Insertable<Promise> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('type')) {
      context.handle(
        _typeMeta,
        type.isAcceptableOrUnknown(data['type']!, _typeMeta),
      );
    } else if (isInserting) {
      context.missing(_typeMeta);
    }
    if (data.containsKey('priority')) {
      context.handle(
        _priorityMeta,
        priority.isAcceptableOrUnknown(data['priority']!, _priorityMeta),
      );
    }
    if (data.containsKey('from_facility')) {
      context.handle(
        _fromFacilityMeta,
        fromFacility.isAcceptableOrUnknown(
          data['from_facility']!,
          _fromFacilityMeta,
        ),
      );
    }
    if (data.containsKey('from_worker')) {
      context.handle(
        _fromWorkerMeta,
        fromWorker.isAcceptableOrUnknown(data['from_worker']!, _fromWorkerMeta),
      );
    }
    if (data.containsKey('to_facility')) {
      context.handle(
        _toFacilityMeta,
        toFacility.isAcceptableOrUnknown(data['to_facility']!, _toFacilityMeta),
      );
    }
    if (data.containsKey('to_role')) {
      context.handle(
        _toRoleMeta,
        toRole.isAcceptableOrUnknown(data['to_role']!, _toRoleMeta),
      );
    }
    if (data.containsKey('description_json')) {
      context.handle(
        _descriptionJsonMeta,
        descriptionJson.isAcceptableOrUnknown(
          data['description_json']!,
          _descriptionJsonMeta,
        ),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('sla_start')) {
      context.handle(
        _slaStartMeta,
        slaStart.isAcceptableOrUnknown(data['sla_start']!, _slaStartMeta),
      );
    }
    if (data.containsKey('deadline')) {
      context.handle(
        _deadlineMeta,
        deadline.isAcceptableOrUnknown(data['deadline']!, _deadlineMeta),
      );
    }
    if (data.containsKey('evidence_json')) {
      context.handle(
        _evidenceJsonMeta,
        evidenceJson.isAcceptableOrUnknown(
          data['evidence_json']!,
          _evidenceJsonMeta,
        ),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('ladder_json')) {
      context.handle(
        _ladderJsonMeta,
        ladderJson.isAcceptableOrUnknown(data['ladder_json']!, _ladderJsonMeta),
      );
    }
    if (data.containsKey('version')) {
      context.handle(
        _versionMeta,
        version.isAcceptableOrUnknown(data['version']!, _versionMeta),
      );
    }
    if (data.containsKey('dirty')) {
      context.handle(
        _dirtyMeta,
        dirty.isAcceptableOrUnknown(data['dirty']!, _dirtyMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Promise map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Promise(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}id'],
      )!,
      type: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}type'],
      )!,
      priority: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}priority'],
      )!,
      fromFacility: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}from_facility'],
      ),
      fromWorker: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}from_worker'],
      ),
      toFacility: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}to_facility'],
      ),
      toRole: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}to_role'],
      ),
      descriptionJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}description_json'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}created_at'],
      )!,
      slaStart: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sla_start'],
      ),
      deadline: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}deadline'],
      ),
      evidenceJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}evidence_json'],
      ),
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      ladderJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}ladder_json'],
      )!,
      version: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}version'],
      )!,
      dirty: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}dirty'],
      )!,
    );
  }

  @override
  $PromisesTable createAlias(String alias) {
    return $PromisesTable(attachedDatabase, alias);
  }
}

class Promise extends DataClass implements Insertable<Promise> {
  final String id;
  final String type;
  final String priority;
  final String? fromFacility;
  final String? fromWorker;
  final String? toFacility;
  final String? toRole;
  final String descriptionJson;
  final String createdAt;
  final String? slaStart;
  final String? deadline;
  final String? evidenceJson;
  final String status;
  final String ladderJson;
  final int version;
  final int dirty;
  const Promise({
    required this.id,
    required this.type,
    required this.priority,
    this.fromFacility,
    this.fromWorker,
    this.toFacility,
    this.toRole,
    required this.descriptionJson,
    required this.createdAt,
    this.slaStart,
    this.deadline,
    this.evidenceJson,
    required this.status,
    required this.ladderJson,
    required this.version,
    required this.dirty,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['type'] = Variable<String>(type);
    map['priority'] = Variable<String>(priority);
    if (!nullToAbsent || fromFacility != null) {
      map['from_facility'] = Variable<String>(fromFacility);
    }
    if (!nullToAbsent || fromWorker != null) {
      map['from_worker'] = Variable<String>(fromWorker);
    }
    if (!nullToAbsent || toFacility != null) {
      map['to_facility'] = Variable<String>(toFacility);
    }
    if (!nullToAbsent || toRole != null) {
      map['to_role'] = Variable<String>(toRole);
    }
    map['description_json'] = Variable<String>(descriptionJson);
    map['created_at'] = Variable<String>(createdAt);
    if (!nullToAbsent || slaStart != null) {
      map['sla_start'] = Variable<String>(slaStart);
    }
    if (!nullToAbsent || deadline != null) {
      map['deadline'] = Variable<String>(deadline);
    }
    if (!nullToAbsent || evidenceJson != null) {
      map['evidence_json'] = Variable<String>(evidenceJson);
    }
    map['status'] = Variable<String>(status);
    map['ladder_json'] = Variable<String>(ladderJson);
    map['version'] = Variable<int>(version);
    map['dirty'] = Variable<int>(dirty);
    return map;
  }

  PromisesCompanion toCompanion(bool nullToAbsent) {
    return PromisesCompanion(
      id: Value(id),
      type: Value(type),
      priority: Value(priority),
      fromFacility: fromFacility == null && nullToAbsent
          ? const Value.absent()
          : Value(fromFacility),
      fromWorker: fromWorker == null && nullToAbsent
          ? const Value.absent()
          : Value(fromWorker),
      toFacility: toFacility == null && nullToAbsent
          ? const Value.absent()
          : Value(toFacility),
      toRole: toRole == null && nullToAbsent
          ? const Value.absent()
          : Value(toRole),
      descriptionJson: Value(descriptionJson),
      createdAt: Value(createdAt),
      slaStart: slaStart == null && nullToAbsent
          ? const Value.absent()
          : Value(slaStart),
      deadline: deadline == null && nullToAbsent
          ? const Value.absent()
          : Value(deadline),
      evidenceJson: evidenceJson == null && nullToAbsent
          ? const Value.absent()
          : Value(evidenceJson),
      status: Value(status),
      ladderJson: Value(ladderJson),
      version: Value(version),
      dirty: Value(dirty),
    );
  }

  factory Promise.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Promise(
      id: serializer.fromJson<String>(json['id']),
      type: serializer.fromJson<String>(json['type']),
      priority: serializer.fromJson<String>(json['priority']),
      fromFacility: serializer.fromJson<String?>(json['fromFacility']),
      fromWorker: serializer.fromJson<String?>(json['fromWorker']),
      toFacility: serializer.fromJson<String?>(json['toFacility']),
      toRole: serializer.fromJson<String?>(json['toRole']),
      descriptionJson: serializer.fromJson<String>(json['descriptionJson']),
      createdAt: serializer.fromJson<String>(json['createdAt']),
      slaStart: serializer.fromJson<String?>(json['slaStart']),
      deadline: serializer.fromJson<String?>(json['deadline']),
      evidenceJson: serializer.fromJson<String?>(json['evidenceJson']),
      status: serializer.fromJson<String>(json['status']),
      ladderJson: serializer.fromJson<String>(json['ladderJson']),
      version: serializer.fromJson<int>(json['version']),
      dirty: serializer.fromJson<int>(json['dirty']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'type': serializer.toJson<String>(type),
      'priority': serializer.toJson<String>(priority),
      'fromFacility': serializer.toJson<String?>(fromFacility),
      'fromWorker': serializer.toJson<String?>(fromWorker),
      'toFacility': serializer.toJson<String?>(toFacility),
      'toRole': serializer.toJson<String?>(toRole),
      'descriptionJson': serializer.toJson<String>(descriptionJson),
      'createdAt': serializer.toJson<String>(createdAt),
      'slaStart': serializer.toJson<String?>(slaStart),
      'deadline': serializer.toJson<String?>(deadline),
      'evidenceJson': serializer.toJson<String?>(evidenceJson),
      'status': serializer.toJson<String>(status),
      'ladderJson': serializer.toJson<String>(ladderJson),
      'version': serializer.toJson<int>(version),
      'dirty': serializer.toJson<int>(dirty),
    };
  }

  Promise copyWith({
    String? id,
    String? type,
    String? priority,
    Value<String?> fromFacility = const Value.absent(),
    Value<String?> fromWorker = const Value.absent(),
    Value<String?> toFacility = const Value.absent(),
    Value<String?> toRole = const Value.absent(),
    String? descriptionJson,
    String? createdAt,
    Value<String?> slaStart = const Value.absent(),
    Value<String?> deadline = const Value.absent(),
    Value<String?> evidenceJson = const Value.absent(),
    String? status,
    String? ladderJson,
    int? version,
    int? dirty,
  }) => Promise(
    id: id ?? this.id,
    type: type ?? this.type,
    priority: priority ?? this.priority,
    fromFacility: fromFacility.present ? fromFacility.value : this.fromFacility,
    fromWorker: fromWorker.present ? fromWorker.value : this.fromWorker,
    toFacility: toFacility.present ? toFacility.value : this.toFacility,
    toRole: toRole.present ? toRole.value : this.toRole,
    descriptionJson: descriptionJson ?? this.descriptionJson,
    createdAt: createdAt ?? this.createdAt,
    slaStart: slaStart.present ? slaStart.value : this.slaStart,
    deadline: deadline.present ? deadline.value : this.deadline,
    evidenceJson: evidenceJson.present ? evidenceJson.value : this.evidenceJson,
    status: status ?? this.status,
    ladderJson: ladderJson ?? this.ladderJson,
    version: version ?? this.version,
    dirty: dirty ?? this.dirty,
  );
  Promise copyWithCompanion(PromisesCompanion data) {
    return Promise(
      id: data.id.present ? data.id.value : this.id,
      type: data.type.present ? data.type.value : this.type,
      priority: data.priority.present ? data.priority.value : this.priority,
      fromFacility: data.fromFacility.present
          ? data.fromFacility.value
          : this.fromFacility,
      fromWorker: data.fromWorker.present
          ? data.fromWorker.value
          : this.fromWorker,
      toFacility: data.toFacility.present
          ? data.toFacility.value
          : this.toFacility,
      toRole: data.toRole.present ? data.toRole.value : this.toRole,
      descriptionJson: data.descriptionJson.present
          ? data.descriptionJson.value
          : this.descriptionJson,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      slaStart: data.slaStart.present ? data.slaStart.value : this.slaStart,
      deadline: data.deadline.present ? data.deadline.value : this.deadline,
      evidenceJson: data.evidenceJson.present
          ? data.evidenceJson.value
          : this.evidenceJson,
      status: data.status.present ? data.status.value : this.status,
      ladderJson: data.ladderJson.present
          ? data.ladderJson.value
          : this.ladderJson,
      version: data.version.present ? data.version.value : this.version,
      dirty: data.dirty.present ? data.dirty.value : this.dirty,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Promise(')
          ..write('id: $id, ')
          ..write('type: $type, ')
          ..write('priority: $priority, ')
          ..write('fromFacility: $fromFacility, ')
          ..write('fromWorker: $fromWorker, ')
          ..write('toFacility: $toFacility, ')
          ..write('toRole: $toRole, ')
          ..write('descriptionJson: $descriptionJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('slaStart: $slaStart, ')
          ..write('deadline: $deadline, ')
          ..write('evidenceJson: $evidenceJson, ')
          ..write('status: $status, ')
          ..write('ladderJson: $ladderJson, ')
          ..write('version: $version, ')
          ..write('dirty: $dirty')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    type,
    priority,
    fromFacility,
    fromWorker,
    toFacility,
    toRole,
    descriptionJson,
    createdAt,
    slaStart,
    deadline,
    evidenceJson,
    status,
    ladderJson,
    version,
    dirty,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Promise &&
          other.id == this.id &&
          other.type == this.type &&
          other.priority == this.priority &&
          other.fromFacility == this.fromFacility &&
          other.fromWorker == this.fromWorker &&
          other.toFacility == this.toFacility &&
          other.toRole == this.toRole &&
          other.descriptionJson == this.descriptionJson &&
          other.createdAt == this.createdAt &&
          other.slaStart == this.slaStart &&
          other.deadline == this.deadline &&
          other.evidenceJson == this.evidenceJson &&
          other.status == this.status &&
          other.ladderJson == this.ladderJson &&
          other.version == this.version &&
          other.dirty == this.dirty);
}

class PromisesCompanion extends UpdateCompanion<Promise> {
  final Value<String> id;
  final Value<String> type;
  final Value<String> priority;
  final Value<String?> fromFacility;
  final Value<String?> fromWorker;
  final Value<String?> toFacility;
  final Value<String?> toRole;
  final Value<String> descriptionJson;
  final Value<String> createdAt;
  final Value<String?> slaStart;
  final Value<String?> deadline;
  final Value<String?> evidenceJson;
  final Value<String> status;
  final Value<String> ladderJson;
  final Value<int> version;
  final Value<int> dirty;
  final Value<int> rowid;
  const PromisesCompanion({
    this.id = const Value.absent(),
    this.type = const Value.absent(),
    this.priority = const Value.absent(),
    this.fromFacility = const Value.absent(),
    this.fromWorker = const Value.absent(),
    this.toFacility = const Value.absent(),
    this.toRole = const Value.absent(),
    this.descriptionJson = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.slaStart = const Value.absent(),
    this.deadline = const Value.absent(),
    this.evidenceJson = const Value.absent(),
    this.status = const Value.absent(),
    this.ladderJson = const Value.absent(),
    this.version = const Value.absent(),
    this.dirty = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PromisesCompanion.insert({
    required String id,
    required String type,
    this.priority = const Value.absent(),
    this.fromFacility = const Value.absent(),
    this.fromWorker = const Value.absent(),
    this.toFacility = const Value.absent(),
    this.toRole = const Value.absent(),
    this.descriptionJson = const Value.absent(),
    required String createdAt,
    this.slaStart = const Value.absent(),
    this.deadline = const Value.absent(),
    this.evidenceJson = const Value.absent(),
    this.status = const Value.absent(),
    this.ladderJson = const Value.absent(),
    this.version = const Value.absent(),
    this.dirty = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : id = Value(id),
       type = Value(type),
       createdAt = Value(createdAt);
  static Insertable<Promise> custom({
    Expression<String>? id,
    Expression<String>? type,
    Expression<String>? priority,
    Expression<String>? fromFacility,
    Expression<String>? fromWorker,
    Expression<String>? toFacility,
    Expression<String>? toRole,
    Expression<String>? descriptionJson,
    Expression<String>? createdAt,
    Expression<String>? slaStart,
    Expression<String>? deadline,
    Expression<String>? evidenceJson,
    Expression<String>? status,
    Expression<String>? ladderJson,
    Expression<int>? version,
    Expression<int>? dirty,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (type != null) 'type': type,
      if (priority != null) 'priority': priority,
      if (fromFacility != null) 'from_facility': fromFacility,
      if (fromWorker != null) 'from_worker': fromWorker,
      if (toFacility != null) 'to_facility': toFacility,
      if (toRole != null) 'to_role': toRole,
      if (descriptionJson != null) 'description_json': descriptionJson,
      if (createdAt != null) 'created_at': createdAt,
      if (slaStart != null) 'sla_start': slaStart,
      if (deadline != null) 'deadline': deadline,
      if (evidenceJson != null) 'evidence_json': evidenceJson,
      if (status != null) 'status': status,
      if (ladderJson != null) 'ladder_json': ladderJson,
      if (version != null) 'version': version,
      if (dirty != null) 'dirty': dirty,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PromisesCompanion copyWith({
    Value<String>? id,
    Value<String>? type,
    Value<String>? priority,
    Value<String?>? fromFacility,
    Value<String?>? fromWorker,
    Value<String?>? toFacility,
    Value<String?>? toRole,
    Value<String>? descriptionJson,
    Value<String>? createdAt,
    Value<String?>? slaStart,
    Value<String?>? deadline,
    Value<String?>? evidenceJson,
    Value<String>? status,
    Value<String>? ladderJson,
    Value<int>? version,
    Value<int>? dirty,
    Value<int>? rowid,
  }) {
    return PromisesCompanion(
      id: id ?? this.id,
      type: type ?? this.type,
      priority: priority ?? this.priority,
      fromFacility: fromFacility ?? this.fromFacility,
      fromWorker: fromWorker ?? this.fromWorker,
      toFacility: toFacility ?? this.toFacility,
      toRole: toRole ?? this.toRole,
      descriptionJson: descriptionJson ?? this.descriptionJson,
      createdAt: createdAt ?? this.createdAt,
      slaStart: slaStart ?? this.slaStart,
      deadline: deadline ?? this.deadline,
      evidenceJson: evidenceJson ?? this.evidenceJson,
      status: status ?? this.status,
      ladderJson: ladderJson ?? this.ladderJson,
      version: version ?? this.version,
      dirty: dirty ?? this.dirty,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (type.present) {
      map['type'] = Variable<String>(type.value);
    }
    if (priority.present) {
      map['priority'] = Variable<String>(priority.value);
    }
    if (fromFacility.present) {
      map['from_facility'] = Variable<String>(fromFacility.value);
    }
    if (fromWorker.present) {
      map['from_worker'] = Variable<String>(fromWorker.value);
    }
    if (toFacility.present) {
      map['to_facility'] = Variable<String>(toFacility.value);
    }
    if (toRole.present) {
      map['to_role'] = Variable<String>(toRole.value);
    }
    if (descriptionJson.present) {
      map['description_json'] = Variable<String>(descriptionJson.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    if (slaStart.present) {
      map['sla_start'] = Variable<String>(slaStart.value);
    }
    if (deadline.present) {
      map['deadline'] = Variable<String>(deadline.value);
    }
    if (evidenceJson.present) {
      map['evidence_json'] = Variable<String>(evidenceJson.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (ladderJson.present) {
      map['ladder_json'] = Variable<String>(ladderJson.value);
    }
    if (version.present) {
      map['version'] = Variable<int>(version.value);
    }
    if (dirty.present) {
      map['dirty'] = Variable<int>(dirty.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PromisesCompanion(')
          ..write('id: $id, ')
          ..write('type: $type, ')
          ..write('priority: $priority, ')
          ..write('fromFacility: $fromFacility, ')
          ..write('fromWorker: $fromWorker, ')
          ..write('toFacility: $toFacility, ')
          ..write('toRole: $toRole, ')
          ..write('descriptionJson: $descriptionJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('slaStart: $slaStart, ')
          ..write('deadline: $deadline, ')
          ..write('evidenceJson: $evidenceJson, ')
          ..write('status: $status, ')
          ..write('ladderJson: $ladderJson, ')
          ..write('version: $version, ')
          ..write('dirty: $dirty, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $SyncJournalsTable extends SyncJournals
    with TableInfo<$SyncJournalsTable, SyncJournal> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncJournalsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _opIdMeta = const VerificationMeta('opId');
  @override
  late final GeneratedColumn<String> opId = GeneratedColumn<String>(
    'op_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _seqMeta = const VerificationMeta('seq');
  @override
  late final GeneratedColumn<int> seq = GeneratedColumn<int>(
    'seq',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _entityMeta = const VerificationMeta('entity');
  @override
  late final GeneratedColumn<String> entity = GeneratedColumn<String>(
    'entity',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadJsonMeta = const VerificationMeta(
    'payloadJson',
  );
  @override
  late final GeneratedColumn<String> payloadJson = GeneratedColumn<String>(
    'payload_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _priorityMeta = const VerificationMeta(
    'priority',
  );
  @override
  late final GeneratedColumn<String> priority = GeneratedColumn<String>(
    'priority',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('referral'),
  );
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
    'status',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('pending'),
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<String> createdAt = GeneratedColumn<String>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  @override
  List<GeneratedColumn> get $columns => [
    opId,
    seq,
    entity,
    payloadJson,
    priority,
    status,
    createdAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_journals';
  @override
  VerificationContext validateIntegrity(
    Insertable<SyncJournal> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('op_id')) {
      context.handle(
        _opIdMeta,
        opId.isAcceptableOrUnknown(data['op_id']!, _opIdMeta),
      );
    } else if (isInserting) {
      context.missing(_opIdMeta);
    }
    if (data.containsKey('seq')) {
      context.handle(
        _seqMeta,
        seq.isAcceptableOrUnknown(data['seq']!, _seqMeta),
      );
    }
    if (data.containsKey('entity')) {
      context.handle(
        _entityMeta,
        entity.isAcceptableOrUnknown(data['entity']!, _entityMeta),
      );
    } else if (isInserting) {
      context.missing(_entityMeta);
    }
    if (data.containsKey('payload_json')) {
      context.handle(
        _payloadJsonMeta,
        payloadJson.isAcceptableOrUnknown(
          data['payload_json']!,
          _payloadJsonMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_payloadJsonMeta);
    }
    if (data.containsKey('priority')) {
      context.handle(
        _priorityMeta,
        priority.isAcceptableOrUnknown(data['priority']!, _priorityMeta),
      );
    }
    if (data.containsKey('status')) {
      context.handle(
        _statusMeta,
        status.isAcceptableOrUnknown(data['status']!, _statusMeta),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {seq};
  @override
  SyncJournal map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncJournal(
      opId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}op_id'],
      )!,
      seq: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}seq'],
      )!,
      entity: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entity'],
      )!,
      payloadJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload_json'],
      )!,
      priority: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}priority'],
      )!,
      status: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}status'],
      )!,
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}created_at'],
      )!,
    );
  }

  @override
  $SyncJournalsTable createAlias(String alias) {
    return $SyncJournalsTable(attachedDatabase, alias);
  }
}

class SyncJournal extends DataClass implements Insertable<SyncJournal> {
  final String opId;
  final int seq;
  final String entity;
  final String payloadJson;
  final String priority;
  final String status;
  final String createdAt;
  const SyncJournal({
    required this.opId,
    required this.seq,
    required this.entity,
    required this.payloadJson,
    required this.priority,
    required this.status,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['op_id'] = Variable<String>(opId);
    map['seq'] = Variable<int>(seq);
    map['entity'] = Variable<String>(entity);
    map['payload_json'] = Variable<String>(payloadJson);
    map['priority'] = Variable<String>(priority);
    map['status'] = Variable<String>(status);
    map['created_at'] = Variable<String>(createdAt);
    return map;
  }

  SyncJournalsCompanion toCompanion(bool nullToAbsent) {
    return SyncJournalsCompanion(
      opId: Value(opId),
      seq: Value(seq),
      entity: Value(entity),
      payloadJson: Value(payloadJson),
      priority: Value(priority),
      status: Value(status),
      createdAt: Value(createdAt),
    );
  }

  factory SyncJournal.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncJournal(
      opId: serializer.fromJson<String>(json['opId']),
      seq: serializer.fromJson<int>(json['seq']),
      entity: serializer.fromJson<String>(json['entity']),
      payloadJson: serializer.fromJson<String>(json['payloadJson']),
      priority: serializer.fromJson<String>(json['priority']),
      status: serializer.fromJson<String>(json['status']),
      createdAt: serializer.fromJson<String>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'opId': serializer.toJson<String>(opId),
      'seq': serializer.toJson<int>(seq),
      'entity': serializer.toJson<String>(entity),
      'payloadJson': serializer.toJson<String>(payloadJson),
      'priority': serializer.toJson<String>(priority),
      'status': serializer.toJson<String>(status),
      'createdAt': serializer.toJson<String>(createdAt),
    };
  }

  SyncJournal copyWith({
    String? opId,
    int? seq,
    String? entity,
    String? payloadJson,
    String? priority,
    String? status,
    String? createdAt,
  }) => SyncJournal(
    opId: opId ?? this.opId,
    seq: seq ?? this.seq,
    entity: entity ?? this.entity,
    payloadJson: payloadJson ?? this.payloadJson,
    priority: priority ?? this.priority,
    status: status ?? this.status,
    createdAt: createdAt ?? this.createdAt,
  );
  SyncJournal copyWithCompanion(SyncJournalsCompanion data) {
    return SyncJournal(
      opId: data.opId.present ? data.opId.value : this.opId,
      seq: data.seq.present ? data.seq.value : this.seq,
      entity: data.entity.present ? data.entity.value : this.entity,
      payloadJson: data.payloadJson.present
          ? data.payloadJson.value
          : this.payloadJson,
      priority: data.priority.present ? data.priority.value : this.priority,
      status: data.status.present ? data.status.value : this.status,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncJournal(')
          ..write('opId: $opId, ')
          ..write('seq: $seq, ')
          ..write('entity: $entity, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('priority: $priority, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(opId, seq, entity, payloadJson, priority, status, createdAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncJournal &&
          other.opId == this.opId &&
          other.seq == this.seq &&
          other.entity == this.entity &&
          other.payloadJson == this.payloadJson &&
          other.priority == this.priority &&
          other.status == this.status &&
          other.createdAt == this.createdAt);
}

class SyncJournalsCompanion extends UpdateCompanion<SyncJournal> {
  final Value<String> opId;
  final Value<int> seq;
  final Value<String> entity;
  final Value<String> payloadJson;
  final Value<String> priority;
  final Value<String> status;
  final Value<String> createdAt;
  const SyncJournalsCompanion({
    this.opId = const Value.absent(),
    this.seq = const Value.absent(),
    this.entity = const Value.absent(),
    this.payloadJson = const Value.absent(),
    this.priority = const Value.absent(),
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  SyncJournalsCompanion.insert({
    required String opId,
    this.seq = const Value.absent(),
    required String entity,
    required String payloadJson,
    this.priority = const Value.absent(),
    this.status = const Value.absent(),
    required String createdAt,
  }) : opId = Value(opId),
       entity = Value(entity),
       payloadJson = Value(payloadJson),
       createdAt = Value(createdAt);
  static Insertable<SyncJournal> custom({
    Expression<String>? opId,
    Expression<int>? seq,
    Expression<String>? entity,
    Expression<String>? payloadJson,
    Expression<String>? priority,
    Expression<String>? status,
    Expression<String>? createdAt,
  }) {
    return RawValuesInsertable({
      if (opId != null) 'op_id': opId,
      if (seq != null) 'seq': seq,
      if (entity != null) 'entity': entity,
      if (payloadJson != null) 'payload_json': payloadJson,
      if (priority != null) 'priority': priority,
      if (status != null) 'status': status,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  SyncJournalsCompanion copyWith({
    Value<String>? opId,
    Value<int>? seq,
    Value<String>? entity,
    Value<String>? payloadJson,
    Value<String>? priority,
    Value<String>? status,
    Value<String>? createdAt,
  }) {
    return SyncJournalsCompanion(
      opId: opId ?? this.opId,
      seq: seq ?? this.seq,
      entity: entity ?? this.entity,
      payloadJson: payloadJson ?? this.payloadJson,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (opId.present) {
      map['op_id'] = Variable<String>(opId.value);
    }
    if (seq.present) {
      map['seq'] = Variable<int>(seq.value);
    }
    if (entity.present) {
      map['entity'] = Variable<String>(entity.value);
    }
    if (payloadJson.present) {
      map['payload_json'] = Variable<String>(payloadJson.value);
    }
    if (priority.present) {
      map['priority'] = Variable<String>(priority.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<String>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncJournalsCompanion(')
          ..write('opId: $opId, ')
          ..write('seq: $seq, ')
          ..write('entity: $entity, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('priority: $priority, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $HouseholdsTable households = $HouseholdsTable(this);
  late final $PatientsTable patients = $PatientsTable(this);
  late final $PromisesTable promises = $PromisesTable(this);
  late final $SyncJournalsTable syncJournals = $SyncJournalsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    households,
    patients,
    promises,
    syncJournals,
  ];
}

typedef $$HouseholdsTableCreateCompanionBuilder =
    HouseholdsCompanion Function({
      required String id,
      required String catchment,
      required String village,
      Value<String> landmark,
      required String headName,
      Value<String> membersJson,
      Value<int> rowid,
    });
typedef $$HouseholdsTableUpdateCompanionBuilder =
    HouseholdsCompanion Function({
      Value<String> id,
      Value<String> catchment,
      Value<String> village,
      Value<String> landmark,
      Value<String> headName,
      Value<String> membersJson,
      Value<int> rowid,
    });

final class $$HouseholdsTableReferences
    extends BaseReferences<_$AppDatabase, $HouseholdsTable, Household> {
  $$HouseholdsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$PatientsTable, List<Patient>> _patientsRefsTable(
    _$AppDatabase db,
  ) => MultiTypedResultKey.fromTable(
    db.patients,
    aliasName: $_aliasNameGenerator(db.households.id, db.patients.householdId),
  );

  $$PatientsTableProcessedTableManager get patientsRefs {
    final manager = $$PatientsTableTableManager(
      $_db,
      $_db.patients,
    ).filter((f) => f.householdId.id.sqlEquals($_itemColumn<String>('id')!));

    final cache = $_typedResult.readTableOrNull(_patientsRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$HouseholdsTableFilterComposer
    extends Composer<_$AppDatabase, $HouseholdsTable> {
  $$HouseholdsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get catchment => $composableBuilder(
    column: $table.catchment,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get village => $composableBuilder(
    column: $table.village,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get landmark => $composableBuilder(
    column: $table.landmark,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get headName => $composableBuilder(
    column: $table.headName,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get membersJson => $composableBuilder(
    column: $table.membersJson,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> patientsRefs(
    Expression<bool> Function($$PatientsTableFilterComposer f) f,
  ) {
    final $$PatientsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.patients,
      getReferencedColumn: (t) => t.householdId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$PatientsTableFilterComposer(
            $db: $db,
            $table: $db.patients,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$HouseholdsTableOrderingComposer
    extends Composer<_$AppDatabase, $HouseholdsTable> {
  $$HouseholdsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get catchment => $composableBuilder(
    column: $table.catchment,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get village => $composableBuilder(
    column: $table.village,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get landmark => $composableBuilder(
    column: $table.landmark,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get headName => $composableBuilder(
    column: $table.headName,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get membersJson => $composableBuilder(
    column: $table.membersJson,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$HouseholdsTableAnnotationComposer
    extends Composer<_$AppDatabase, $HouseholdsTable> {
  $$HouseholdsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get catchment =>
      $composableBuilder(column: $table.catchment, builder: (column) => column);

  GeneratedColumn<String> get village =>
      $composableBuilder(column: $table.village, builder: (column) => column);

  GeneratedColumn<String> get landmark =>
      $composableBuilder(column: $table.landmark, builder: (column) => column);

  GeneratedColumn<String> get headName =>
      $composableBuilder(column: $table.headName, builder: (column) => column);

  GeneratedColumn<String> get membersJson => $composableBuilder(
    column: $table.membersJson,
    builder: (column) => column,
  );

  Expression<T> patientsRefs<T extends Object>(
    Expression<T> Function($$PatientsTableAnnotationComposer a) f,
  ) {
    final $$PatientsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.patients,
      getReferencedColumn: (t) => t.householdId,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$PatientsTableAnnotationComposer(
            $db: $db,
            $table: $db.patients,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$HouseholdsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $HouseholdsTable,
          Household,
          $$HouseholdsTableFilterComposer,
          $$HouseholdsTableOrderingComposer,
          $$HouseholdsTableAnnotationComposer,
          $$HouseholdsTableCreateCompanionBuilder,
          $$HouseholdsTableUpdateCompanionBuilder,
          (Household, $$HouseholdsTableReferences),
          Household,
          PrefetchHooks Function({bool patientsRefs})
        > {
  $$HouseholdsTableTableManager(_$AppDatabase db, $HouseholdsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$HouseholdsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$HouseholdsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$HouseholdsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> catchment = const Value.absent(),
                Value<String> village = const Value.absent(),
                Value<String> landmark = const Value.absent(),
                Value<String> headName = const Value.absent(),
                Value<String> membersJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HouseholdsCompanion(
                id: id,
                catchment: catchment,
                village: village,
                landmark: landmark,
                headName: headName,
                membersJson: membersJson,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String catchment,
                required String village,
                Value<String> landmark = const Value.absent(),
                required String headName,
                Value<String> membersJson = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => HouseholdsCompanion.insert(
                id: id,
                catchment: catchment,
                village: village,
                landmark: landmark,
                headName: headName,
                membersJson: membersJson,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$HouseholdsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({patientsRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (patientsRefs) db.patients],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (patientsRefs)
                    await $_getPrefetchedData<
                      Household,
                      $HouseholdsTable,
                      Patient
                    >(
                      currentTable: table,
                      referencedTable: $$HouseholdsTableReferences
                          ._patientsRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$HouseholdsTableReferences(
                            db,
                            table,
                            p0,
                          ).patientsRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where(
                            (e) => e.householdId == item.id,
                          ),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$HouseholdsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $HouseholdsTable,
      Household,
      $$HouseholdsTableFilterComposer,
      $$HouseholdsTableOrderingComposer,
      $$HouseholdsTableAnnotationComposer,
      $$HouseholdsTableCreateCompanionBuilder,
      $$HouseholdsTableUpdateCompanionBuilder,
      (Household, $$HouseholdsTableReferences),
      Household,
      PrefetchHooks Function({bool patientsRefs})
    >;
typedef $$PatientsTableCreateCompanionBuilder =
    PatientsCompanion Function({
      required String localId,
      required String householdId,
      required String name,
      Value<String?> dob,
      Value<String?> gender,
      required String village,
      Value<int?> ageMonths,
      Value<String?> abhaRef,
      Value<int> rowid,
    });
typedef $$PatientsTableUpdateCompanionBuilder =
    PatientsCompanion Function({
      Value<String> localId,
      Value<String> householdId,
      Value<String> name,
      Value<String?> dob,
      Value<String?> gender,
      Value<String> village,
      Value<int?> ageMonths,
      Value<String?> abhaRef,
      Value<int> rowid,
    });

final class $$PatientsTableReferences
    extends BaseReferences<_$AppDatabase, $PatientsTable, Patient> {
  $$PatientsTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $HouseholdsTable _householdIdTable(_$AppDatabase db) =>
      db.households.createAlias(
        $_aliasNameGenerator(db.patients.householdId, db.households.id),
      );

  $$HouseholdsTableProcessedTableManager get householdId {
    final $_column = $_itemColumn<String>('household_id')!;

    final manager = $$HouseholdsTableTableManager(
      $_db,
      $_db.households,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_householdIdTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$PatientsTableFilterComposer
    extends Composer<_$AppDatabase, $PatientsTable> {
  $$PatientsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get localId => $composableBuilder(
    column: $table.localId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get dob => $composableBuilder(
    column: $table.dob,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get gender => $composableBuilder(
    column: $table.gender,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get village => $composableBuilder(
    column: $table.village,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get ageMonths => $composableBuilder(
    column: $table.ageMonths,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get abhaRef => $composableBuilder(
    column: $table.abhaRef,
    builder: (column) => ColumnFilters(column),
  );

  $$HouseholdsTableFilterComposer get householdId {
    final $$HouseholdsTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.householdId,
      referencedTable: $db.households,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HouseholdsTableFilterComposer(
            $db: $db,
            $table: $db.households,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$PatientsTableOrderingComposer
    extends Composer<_$AppDatabase, $PatientsTable> {
  $$PatientsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get localId => $composableBuilder(
    column: $table.localId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get name => $composableBuilder(
    column: $table.name,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get dob => $composableBuilder(
    column: $table.dob,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get gender => $composableBuilder(
    column: $table.gender,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get village => $composableBuilder(
    column: $table.village,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get ageMonths => $composableBuilder(
    column: $table.ageMonths,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get abhaRef => $composableBuilder(
    column: $table.abhaRef,
    builder: (column) => ColumnOrderings(column),
  );

  $$HouseholdsTableOrderingComposer get householdId {
    final $$HouseholdsTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.householdId,
      referencedTable: $db.households,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HouseholdsTableOrderingComposer(
            $db: $db,
            $table: $db.households,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$PatientsTableAnnotationComposer
    extends Composer<_$AppDatabase, $PatientsTable> {
  $$PatientsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get localId =>
      $composableBuilder(column: $table.localId, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get dob =>
      $composableBuilder(column: $table.dob, builder: (column) => column);

  GeneratedColumn<String> get gender =>
      $composableBuilder(column: $table.gender, builder: (column) => column);

  GeneratedColumn<String> get village =>
      $composableBuilder(column: $table.village, builder: (column) => column);

  GeneratedColumn<int> get ageMonths =>
      $composableBuilder(column: $table.ageMonths, builder: (column) => column);

  GeneratedColumn<String> get abhaRef =>
      $composableBuilder(column: $table.abhaRef, builder: (column) => column);

  $$HouseholdsTableAnnotationComposer get householdId {
    final $$HouseholdsTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.householdId,
      referencedTable: $db.households,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$HouseholdsTableAnnotationComposer(
            $db: $db,
            $table: $db.households,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$PatientsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $PatientsTable,
          Patient,
          $$PatientsTableFilterComposer,
          $$PatientsTableOrderingComposer,
          $$PatientsTableAnnotationComposer,
          $$PatientsTableCreateCompanionBuilder,
          $$PatientsTableUpdateCompanionBuilder,
          (Patient, $$PatientsTableReferences),
          Patient,
          PrefetchHooks Function({bool householdId})
        > {
  $$PatientsTableTableManager(_$AppDatabase db, $PatientsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PatientsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PatientsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PatientsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> localId = const Value.absent(),
                Value<String> householdId = const Value.absent(),
                Value<String> name = const Value.absent(),
                Value<String?> dob = const Value.absent(),
                Value<String?> gender = const Value.absent(),
                Value<String> village = const Value.absent(),
                Value<int?> ageMonths = const Value.absent(),
                Value<String?> abhaRef = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PatientsCompanion(
                localId: localId,
                householdId: householdId,
                name: name,
                dob: dob,
                gender: gender,
                village: village,
                ageMonths: ageMonths,
                abhaRef: abhaRef,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String localId,
                required String householdId,
                required String name,
                Value<String?> dob = const Value.absent(),
                Value<String?> gender = const Value.absent(),
                required String village,
                Value<int?> ageMonths = const Value.absent(),
                Value<String?> abhaRef = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PatientsCompanion.insert(
                localId: localId,
                householdId: householdId,
                name: name,
                dob: dob,
                gender: gender,
                village: village,
                ageMonths: ageMonths,
                abhaRef: abhaRef,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$PatientsTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({householdId = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (householdId) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.householdId,
                                referencedTable: $$PatientsTableReferences
                                    ._householdIdTable(db),
                                referencedColumn: $$PatientsTableReferences
                                    ._householdIdTable(db)
                                    .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$PatientsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $PatientsTable,
      Patient,
      $$PatientsTableFilterComposer,
      $$PatientsTableOrderingComposer,
      $$PatientsTableAnnotationComposer,
      $$PatientsTableCreateCompanionBuilder,
      $$PatientsTableUpdateCompanionBuilder,
      (Patient, $$PatientsTableReferences),
      Patient,
      PrefetchHooks Function({bool householdId})
    >;
typedef $$PromisesTableCreateCompanionBuilder =
    PromisesCompanion Function({
      required String id,
      required String type,
      Value<String> priority,
      Value<String?> fromFacility,
      Value<String?> fromWorker,
      Value<String?> toFacility,
      Value<String?> toRole,
      Value<String> descriptionJson,
      required String createdAt,
      Value<String?> slaStart,
      Value<String?> deadline,
      Value<String?> evidenceJson,
      Value<String> status,
      Value<String> ladderJson,
      Value<int> version,
      Value<int> dirty,
      Value<int> rowid,
    });
typedef $$PromisesTableUpdateCompanionBuilder =
    PromisesCompanion Function({
      Value<String> id,
      Value<String> type,
      Value<String> priority,
      Value<String?> fromFacility,
      Value<String?> fromWorker,
      Value<String?> toFacility,
      Value<String?> toRole,
      Value<String> descriptionJson,
      Value<String> createdAt,
      Value<String?> slaStart,
      Value<String?> deadline,
      Value<String?> evidenceJson,
      Value<String> status,
      Value<String> ladderJson,
      Value<int> version,
      Value<int> dirty,
      Value<int> rowid,
    });

class $$PromisesTableFilterComposer
    extends Composer<_$AppDatabase, $PromisesTable> {
  $$PromisesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get type => $composableBuilder(
    column: $table.type,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get priority => $composableBuilder(
    column: $table.priority,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get fromFacility => $composableBuilder(
    column: $table.fromFacility,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get fromWorker => $composableBuilder(
    column: $table.fromWorker,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get toFacility => $composableBuilder(
    column: $table.toFacility,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get toRole => $composableBuilder(
    column: $table.toRole,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get descriptionJson => $composableBuilder(
    column: $table.descriptionJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get slaStart => $composableBuilder(
    column: $table.slaStart,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get deadline => $composableBuilder(
    column: $table.deadline,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get evidenceJson => $composableBuilder(
    column: $table.evidenceJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get ladderJson => $composableBuilder(
    column: $table.ladderJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PromisesTableOrderingComposer
    extends Composer<_$AppDatabase, $PromisesTable> {
  $$PromisesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get type => $composableBuilder(
    column: $table.type,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get priority => $composableBuilder(
    column: $table.priority,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get fromFacility => $composableBuilder(
    column: $table.fromFacility,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get fromWorker => $composableBuilder(
    column: $table.fromWorker,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get toFacility => $composableBuilder(
    column: $table.toFacility,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get toRole => $composableBuilder(
    column: $table.toRole,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get descriptionJson => $composableBuilder(
    column: $table.descriptionJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get slaStart => $composableBuilder(
    column: $table.slaStart,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get deadline => $composableBuilder(
    column: $table.deadline,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get evidenceJson => $composableBuilder(
    column: $table.evidenceJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get ladderJson => $composableBuilder(
    column: $table.ladderJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get dirty => $composableBuilder(
    column: $table.dirty,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PromisesTableAnnotationComposer
    extends Composer<_$AppDatabase, $PromisesTable> {
  $$PromisesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get type =>
      $composableBuilder(column: $table.type, builder: (column) => column);

  GeneratedColumn<String> get priority =>
      $composableBuilder(column: $table.priority, builder: (column) => column);

  GeneratedColumn<String> get fromFacility => $composableBuilder(
    column: $table.fromFacility,
    builder: (column) => column,
  );

  GeneratedColumn<String> get fromWorker => $composableBuilder(
    column: $table.fromWorker,
    builder: (column) => column,
  );

  GeneratedColumn<String> get toFacility => $composableBuilder(
    column: $table.toFacility,
    builder: (column) => column,
  );

  GeneratedColumn<String> get toRole =>
      $composableBuilder(column: $table.toRole, builder: (column) => column);

  GeneratedColumn<String> get descriptionJson => $composableBuilder(
    column: $table.descriptionJson,
    builder: (column) => column,
  );

  GeneratedColumn<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<String> get slaStart =>
      $composableBuilder(column: $table.slaStart, builder: (column) => column);

  GeneratedColumn<String> get deadline =>
      $composableBuilder(column: $table.deadline, builder: (column) => column);

  GeneratedColumn<String> get evidenceJson => $composableBuilder(
    column: $table.evidenceJson,
    builder: (column) => column,
  );

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get ladderJson => $composableBuilder(
    column: $table.ladderJson,
    builder: (column) => column,
  );

  GeneratedColumn<int> get version =>
      $composableBuilder(column: $table.version, builder: (column) => column);

  GeneratedColumn<int> get dirty =>
      $composableBuilder(column: $table.dirty, builder: (column) => column);
}

class $$PromisesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $PromisesTable,
          Promise,
          $$PromisesTableFilterComposer,
          $$PromisesTableOrderingComposer,
          $$PromisesTableAnnotationComposer,
          $$PromisesTableCreateCompanionBuilder,
          $$PromisesTableUpdateCompanionBuilder,
          (Promise, BaseReferences<_$AppDatabase, $PromisesTable, Promise>),
          Promise,
          PrefetchHooks Function()
        > {
  $$PromisesTableTableManager(_$AppDatabase db, $PromisesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PromisesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PromisesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PromisesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> id = const Value.absent(),
                Value<String> type = const Value.absent(),
                Value<String> priority = const Value.absent(),
                Value<String?> fromFacility = const Value.absent(),
                Value<String?> fromWorker = const Value.absent(),
                Value<String?> toFacility = const Value.absent(),
                Value<String?> toRole = const Value.absent(),
                Value<String> descriptionJson = const Value.absent(),
                Value<String> createdAt = const Value.absent(),
                Value<String?> slaStart = const Value.absent(),
                Value<String?> deadline = const Value.absent(),
                Value<String?> evidenceJson = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> ladderJson = const Value.absent(),
                Value<int> version = const Value.absent(),
                Value<int> dirty = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PromisesCompanion(
                id: id,
                type: type,
                priority: priority,
                fromFacility: fromFacility,
                fromWorker: fromWorker,
                toFacility: toFacility,
                toRole: toRole,
                descriptionJson: descriptionJson,
                createdAt: createdAt,
                slaStart: slaStart,
                deadline: deadline,
                evidenceJson: evidenceJson,
                status: status,
                ladderJson: ladderJson,
                version: version,
                dirty: dirty,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String id,
                required String type,
                Value<String> priority = const Value.absent(),
                Value<String?> fromFacility = const Value.absent(),
                Value<String?> fromWorker = const Value.absent(),
                Value<String?> toFacility = const Value.absent(),
                Value<String?> toRole = const Value.absent(),
                Value<String> descriptionJson = const Value.absent(),
                required String createdAt,
                Value<String?> slaStart = const Value.absent(),
                Value<String?> deadline = const Value.absent(),
                Value<String?> evidenceJson = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> ladderJson = const Value.absent(),
                Value<int> version = const Value.absent(),
                Value<int> dirty = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PromisesCompanion.insert(
                id: id,
                type: type,
                priority: priority,
                fromFacility: fromFacility,
                fromWorker: fromWorker,
                toFacility: toFacility,
                toRole: toRole,
                descriptionJson: descriptionJson,
                createdAt: createdAt,
                slaStart: slaStart,
                deadline: deadline,
                evidenceJson: evidenceJson,
                status: status,
                ladderJson: ladderJson,
                version: version,
                dirty: dirty,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PromisesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $PromisesTable,
      Promise,
      $$PromisesTableFilterComposer,
      $$PromisesTableOrderingComposer,
      $$PromisesTableAnnotationComposer,
      $$PromisesTableCreateCompanionBuilder,
      $$PromisesTableUpdateCompanionBuilder,
      (Promise, BaseReferences<_$AppDatabase, $PromisesTable, Promise>),
      Promise,
      PrefetchHooks Function()
    >;
typedef $$SyncJournalsTableCreateCompanionBuilder =
    SyncJournalsCompanion Function({
      required String opId,
      Value<int> seq,
      required String entity,
      required String payloadJson,
      Value<String> priority,
      Value<String> status,
      required String createdAt,
    });
typedef $$SyncJournalsTableUpdateCompanionBuilder =
    SyncJournalsCompanion Function({
      Value<String> opId,
      Value<int> seq,
      Value<String> entity,
      Value<String> payloadJson,
      Value<String> priority,
      Value<String> status,
      Value<String> createdAt,
    });

class $$SyncJournalsTableFilterComposer
    extends Composer<_$AppDatabase, $SyncJournalsTable> {
  $$SyncJournalsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get opId => $composableBuilder(
    column: $table.opId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get seq => $composableBuilder(
    column: $table.seq,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entity => $composableBuilder(
    column: $table.entity,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payloadJson => $composableBuilder(
    column: $table.payloadJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get priority => $composableBuilder(
    column: $table.priority,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SyncJournalsTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncJournalsTable> {
  $$SyncJournalsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get opId => $composableBuilder(
    column: $table.opId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get seq => $composableBuilder(
    column: $table.seq,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entity => $composableBuilder(
    column: $table.entity,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payloadJson => $composableBuilder(
    column: $table.payloadJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get priority => $composableBuilder(
    column: $table.priority,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get status => $composableBuilder(
    column: $table.status,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SyncJournalsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncJournalsTable> {
  $$SyncJournalsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get opId =>
      $composableBuilder(column: $table.opId, builder: (column) => column);

  GeneratedColumn<int> get seq =>
      $composableBuilder(column: $table.seq, builder: (column) => column);

  GeneratedColumn<String> get entity =>
      $composableBuilder(column: $table.entity, builder: (column) => column);

  GeneratedColumn<String> get payloadJson => $composableBuilder(
    column: $table.payloadJson,
    builder: (column) => column,
  );

  GeneratedColumn<String> get priority =>
      $composableBuilder(column: $table.priority, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);
}

class $$SyncJournalsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SyncJournalsTable,
          SyncJournal,
          $$SyncJournalsTableFilterComposer,
          $$SyncJournalsTableOrderingComposer,
          $$SyncJournalsTableAnnotationComposer,
          $$SyncJournalsTableCreateCompanionBuilder,
          $$SyncJournalsTableUpdateCompanionBuilder,
          (
            SyncJournal,
            BaseReferences<_$AppDatabase, $SyncJournalsTable, SyncJournal>,
          ),
          SyncJournal,
          PrefetchHooks Function()
        > {
  $$SyncJournalsTableTableManager(_$AppDatabase db, $SyncJournalsTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncJournalsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncJournalsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncJournalsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> opId = const Value.absent(),
                Value<int> seq = const Value.absent(),
                Value<String> entity = const Value.absent(),
                Value<String> payloadJson = const Value.absent(),
                Value<String> priority = const Value.absent(),
                Value<String> status = const Value.absent(),
                Value<String> createdAt = const Value.absent(),
              }) => SyncJournalsCompanion(
                opId: opId,
                seq: seq,
                entity: entity,
                payloadJson: payloadJson,
                priority: priority,
                status: status,
                createdAt: createdAt,
              ),
          createCompanionCallback:
              ({
                required String opId,
                Value<int> seq = const Value.absent(),
                required String entity,
                required String payloadJson,
                Value<String> priority = const Value.absent(),
                Value<String> status = const Value.absent(),
                required String createdAt,
              }) => SyncJournalsCompanion.insert(
                opId: opId,
                seq: seq,
                entity: entity,
                payloadJson: payloadJson,
                priority: priority,
                status: status,
                createdAt: createdAt,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SyncJournalsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SyncJournalsTable,
      SyncJournal,
      $$SyncJournalsTableFilterComposer,
      $$SyncJournalsTableOrderingComposer,
      $$SyncJournalsTableAnnotationComposer,
      $$SyncJournalsTableCreateCompanionBuilder,
      $$SyncJournalsTableUpdateCompanionBuilder,
      (
        SyncJournal,
        BaseReferences<_$AppDatabase, $SyncJournalsTable, SyncJournal>,
      ),
      SyncJournal,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$HouseholdsTableTableManager get households =>
      $$HouseholdsTableTableManager(_db, _db.households);
  $$PatientsTableTableManager get patients =>
      $$PatientsTableTableManager(_db, _db.patients);
  $$PromisesTableTableManager get promises =>
      $$PromisesTableTableManager(_db, _db.promises);
  $$SyncJournalsTableTableManager get syncJournals =>
      $$SyncJournalsTableTableManager(_db, _db.syncJournals);
}
