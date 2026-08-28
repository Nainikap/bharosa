import 'package:drift/drift.dart';
import 'db.dart';

Future<void> seedIfEmpty(AppDatabase db) async {
  final count = await db.select(db.households).get();
  if (count.isNotEmpty) return;

  final households = [
    {
      'id': 'hh_001',
      'village': 'Khadakwadi',
      'landmark': 'Near primary school',
      'head': 'Sunita Pawar',
      'members': [
        {'localId': 'p_001', 'name': 'Sunita Pawar', 'dob': '1998-04-12', 'gender': 'F', 'ageMonths': 340, 'village': 'Khadakwadi'},
        {'localId': 'p_002', 'name': 'Aarav Pawar', 'dob': '2022-09-01', 'gender': 'M', 'ageMonths': 42, 'village': 'Khadakwadi'},
        {'localId': 'p_003', 'name': 'Ramesh Pawar', 'dob': '1995-11-20', 'gender': 'M', 'ageMonths': 370, 'village': 'Khadakwadi'},
      ]
    },
    {
      'id': 'hh_002',
      'village': 'Khadakwadi',
      'landmark': 'Behind panchayat office',
      'head': 'Lakshmi Jadhav',
      'members': [
        {'localId': 'p_004', 'name': 'Lakshmi Jadhav', 'dob': '1996-07-03', 'gender': 'F', 'ageMonths': 360, 'village': 'Khadakwadi'},
        {'localId': 'p_005', 'name': 'Priya Jadhav', 'dob': '2024-01-15', 'gender': 'F', 'ageMonths': 20, 'village': 'Khadakwadi'},
      ]
    },
    {
      'id': 'hh_003',
      'village': 'Shivapur',
      'landmark': 'Next to Hanuman temple',
      'head': 'Rekha Shinde',
      'members': [
        {'localId': 'p_006', 'name': 'Rekha Shinde', 'dob': '1997-02-28', 'gender': 'F', 'ageMonths': 350, 'village': 'Shivapur'},
        {'localId': 'p_007', 'name': 'Anil Shinde', 'dob': '2023-06-10', 'gender': 'M', 'ageMonths': 32, 'village': 'Shivapur'},
        {'localId': 'p_008', 'name': 'Geeta Shinde', 'dob': '1970-05-05', 'gender': 'F', 'ageMonths': 680, 'village': 'Shivapur'},
      ]
    },
    {
      'id': 'hh_004',
      'village': 'Shivapur',
      'landmark': 'Opposite PHC road',
      'head': 'Meena Kale',
      'members': [
        {'localId': 'p_009', 'name': 'Meena Kale', 'dob': '1999-12-01', 'gender': 'F', 'ageMonths': 310, 'village': 'Shivapur'},
        {'localId': 'p_010', 'name': 'Kavya Kale', 'dob': '2025-02-20', 'gender': 'F', 'ageMonths': 6, 'village': 'Shivapur'},
      ]
    },
    {
      'id': 'hh_005',
      'village': 'Nandgaon',
      'landmark': 'Near water tank',
      'head': 'Savitri More',
      'members': [
        {'localId': 'p_011', 'name': 'Savitri More', 'dob': '1994-09-18', 'gender': 'F', 'ageMonths': 385, 'village': 'Nandgaon'},
        {'localId': 'p_012', 'name': 'Vikram More', 'dob': '2023-11-05', 'gender': 'M', 'ageMonths': 27, 'village': 'Nandgaon'},
      ]
    },
    {
      'id': 'hh_006',
      'village': 'Nandgaon',
      'landmark': 'Behind market yard',
      'head': 'Jyoti Rathod',
      'members': [
        {'localId': 'p_013', 'name': 'Jyoti Rathod', 'dob': '1998-11-11', 'gender': 'F', 'ageMonths': 335, 'village': 'Nandgaon'},
        {'localId': 'p_014', 'name': 'Sahil Rathod', 'dob': '2024-06-22', 'gender': 'M', 'ageMonths': 14, 'village': 'Nandgaon'},
      ]
    },
    {
      'id': 'hh_007',
      'village': 'Khadakwadi',
      'landmark': 'River side huts',
      'head': 'Anita Gaikwad',
      'members': [
        {'localId': 'p_015', 'name': 'Anita Gaikwad', 'dob': '1995-03-14', 'gender': 'F', 'ageMonths': 375, 'village': 'Khadakwadi'},
        {'localId': 'p_016', 'name': 'Rohan Gaikwad', 'dob': '2022-12-10', 'gender': 'M', 'ageMonths': 38, 'village': 'Khadakwadi'},
      ]
    },
    {
      'id': 'hh_008',
      'village': 'Shivapur',
      'landmark': 'Near bus stand',
      'head': 'Usha Patil',
      'members': [
        {'localId': 'p_017', 'name': 'Usha Patil', 'dob': '1996-10-09', 'gender': 'F', 'ageMonths': 355, 'village': 'Shivapur'},
        {'localId': 'p_018', 'name': 'Nisha Patil', 'dob': '2024-11-11', 'gender': 'F', 'ageMonths': 9, 'village': 'Shivapur'},
      ]
    },
  ];

  for (final h in households) {
    await db.into(db.households).insert(
      HouseholdsCompanion.insert(
        id: h['id'] as String,
        catchment: 'ASHA-Rekha',
        village: h['village'] as String,
        landmark: Value(h['landmark'] as String),
        headName: h['head'] as String,
        membersJson: Value(
          (h['members'] as List).map((e) => e.toString()).toList().toString(),
        ),
      ),
    );
    // Use proper JSON
    await (db.update(db.households)..where((t) => t.id.equals(h['id'] as String))).write(
      HouseholdsCompanion(
        membersJson: Value(
          // encode properly
          _encodeMembers(h['members'] as List),
        ),
      ),
    );
    for (final m in h['members'] as List) {
      final mm = m as Map<String, dynamic>;
      await db.into(db.patients).insert(
        PatientsCompanion.insert(
          localId: mm['localId'] as String,
          householdId: h['id'] as String,
          name: mm['name'] as String,
          dob: Value(mm['dob'] as String?),
          gender: Value(mm['gender'] as String?),
          village: mm['village'] as String,
          ageMonths: Value(mm['ageMonths'] as int?),
        ),
      );
    }
  }
}

String _encodeMembers(List members) {
  // manual JSON encode without dart:convert double-encoding quirks
  final out = members.map((m) {
    final mm = m as Map<String, dynamic>;
    final parts = mm.entries.map((e) {
      final v = e.value;
      if (v is String) return '"${e.key}":"$v"';
      return '"${e.key}":$v';
    }).join(',');
    return '{$parts}';
  }).join(',');
  return '[$out]';
}
