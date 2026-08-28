import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

class AuthService {
  Future<bool> isPinSet() async {
    final p = await SharedPreferences.getInstance();
    return p.getBool(AppConfig.pinSetKey) ?? false;
  }

  Future<bool> verifyPin(String pin) async {
    final p = await SharedPreferences.getInstance();
    final stored = p.getString(AppConfig.pinKey);
    return stored == pin;
  }

  Future<void> setPin(String pin, {String ashaName = 'Rekha'}) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(AppConfig.pinKey, pin);
    await p.setBool(AppConfig.pinSetKey, true);
    await p.setString(AppConfig.ashaNameKey, ashaName);
  }

  Future<String> getAshaName() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(AppConfig.ashaNameKey) ?? 'ASHA';
  }

  Future<void> logout() async {
    // Keep PIN, just clear session if needed — for v1 no session token.
  }

  Future<void> resetAll() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(AppConfig.pinKey);
    await p.remove(AppConfig.pinSetKey);
  }
}
