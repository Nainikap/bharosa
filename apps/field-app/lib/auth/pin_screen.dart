import 'package:flutter/material.dart';
import '../utils/constants.dart';
import '../widgets/app_scaffold.dart';
import 'auth_service.dart';

class PinScreen extends StatefulWidget {
  const PinScreen({super.key});
  @override
  State<PinScreen> createState() => _PinScreenState();
}

class _PinScreenState extends State<PinScreen> {
  final _auth = AuthService();
  final _pinCtrl = TextEditingController();
  final _nameCtrl = TextEditingController(text: 'Rekha');
  bool _isSetup = false;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final set = await _auth.isPinSet();
    setState(() {
      _isSetup = !set;
      _loading = false;
    });
  }

  Future<void> _submit() async {
    final pin = _pinCtrl.text.trim();
    if (pin.length < 4) {
      setState(() => _error = 'PIN must be at least 4 digits');
      return;
    }
    setState(() => _error = null);
    if (_isSetup) {
      await _auth.setPin(pin, ashaName: _nameCtrl.text.trim().isEmpty ? 'Rekha' : _nameCtrl.text.trim());
      if (mounted) Navigator.pushReplacementNamed(context, '/home');
    } else {
      final ok = await _auth.verifyPin(pin);
      if (ok) {
        if (mounted) Navigator.pushReplacementNamed(context, '/home');
      } else {
        setState(() => _error = 'Wrong PIN — try again');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(backgroundColor: AppColors.bg, body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight - 48),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 24),
                      const Center(
                        child: Text('⬡', style: TextStyle(fontSize: 48, color: AppColors.teal)),
                      ),
                      const SizedBox(height: 12),
                      Center(
                        child: Text(
                          _isSetup ? 'Set PIN' : 'Enter PIN',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.head),
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Center(
                        child: Text('ASHA field app  ·  offline-first',
                            style: TextStyle(color: AppColors.muted, fontSize: 12)),
                      ),
                      const SizedBox(height: 32),
                      if (_isSetup)
                        TextField(
                          controller: _nameCtrl,
                          style: const TextStyle(color: AppColors.head),
                          decoration: _dec('ASHA name (e.g. Rekha)', Icons.person),
                        ),
                      if (_isSetup) const SizedBox(height: 12),
                      TextField(
                        controller: _pinCtrl,
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        style: const TextStyle(color: AppColors.head, letterSpacing: 6, fontSize: 20),
                        decoration: _dec('PIN (4-6 digits)', Icons.lock),
                        onSubmitted: (_) => _submit(),
                      ),
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(_error!, style: const TextStyle(color: AppColors.red)),
                        ),
                      const SizedBox(height: 18),
                      PrimaryButton(
                        label: _isSetup ? 'Save PIN and start' : 'Login',
                        icon: _isSetup ? Icons.check : Icons.login,
                        onPressed: _submit,
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.only(top: 24),
                    child: Text(
                      'PIN is device-secure · Data encrypted with AES-256\nEvery promise, kept or strengthened',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.muted, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _dec(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: AppColors.muted),
      prefixIcon: Icon(icon, color: AppColors.muted),
      filled: true,
      fillColor: AppColors.card,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.line)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.line)),
      counterText: '',
    );
  }
}
