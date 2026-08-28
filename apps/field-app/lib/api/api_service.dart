import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

class ApiService {
  final http.Client _client = http.Client();
  String get base => AppConfig.apiBase;

  Future<Map<String, dynamic>?> pushSync(List<Map<String, dynamic>> ops) async {
    try {
      final res = await _client
          .post(
            Uri.parse('$base/sync/push'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'ops': ops}),
          )
          .timeout(const Duration(seconds: 8));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<List<dynamic>?> pullSync({int since = 0}) async {
    try {
      final res = await _client
          .get(Uri.parse('$base/sync/pull?since=$since'))
          .timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        return body['deltas'] as List<dynamic>?;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<bool> createReferral(Map<String, dynamic> payload) async {
    try {
      final res = await _client
          .post(
            Uri.parse('$base/referrals'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 8));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }

  Future<bool> healthCheck() async {
    try {
      final res = await _client
          .get(Uri.parse('$base/health'))
          .timeout(const Duration(seconds: 5));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
