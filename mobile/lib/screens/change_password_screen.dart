import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../services/auth_service.dart';
import '../utils/auth_errors.dart';
import '../widgets/auth_shell.dart';
import '../widgets/password_strength_meter.dart';

/// Lets a signed-in user choose a new password (website: /reset-password).
class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _show = false;
  bool _submitting = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final s = context.tr;
    if (_password.text != _confirm.text) {
      setState(() => _error = s.get('auth.passwordMismatch'));
      return;
    }
    if (_password.text.length < 6) {
      setState(() => _error = s.get('auth.passwordTooShort'));
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
      _success = null;
    });
    try {
      await ref.read(authServiceProvider).updatePassword(_password.text);
      if (!mounted) return;
      setState(() => _success = context.tr.get('app.password.updated'));
      _password.clear();
      _confirm.clear();
    } catch (e) {
      setState(() => _error = formatAuthError(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final user = ref.watch(authStateProvider).value?.session?.user;
    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: Text(s.get('accountPage.sections.account.links.resetPassword'))),
        body: Center(
          child: FilledButton(
            onPressed: () => context.push('/forgot-password'),
            child: Text(s.get('auth.forgotPasswordTitle')),
          ),
        ),
      );
    }

    return AuthShell(
      title: s.get('auth.resetPasswordTitle'),
      subtitle: s.get('auth.resetPasswordSubtitle'),
      onBack: () => context.canPop() ? context.pop() : context.go('/account'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthFormField(
            label: s.get('auth.newPassword'),
            controller: _password,
            obscureText: !_show,
            onChanged: (_) => setState(() {}),
            suffix: IconButton(
              icon: Icon(_show ? Icons.visibility_off_outlined : Icons.visibility_outlined),
              onPressed: () => setState(() => _show = !_show),
            ),
          ),
          PasswordStrengthMeter(password: _password.text),
          const SizedBox(height: 18),
          AuthFormField(
            label: s.get('auth.confirmPassword'),
            controller: _confirm,
            obscureText: !_show,
            onChanged: (_) => setState(() {}),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red, fontSize: 13)),
          ],
          if (_success != null) ...[
            const SizedBox(height: 14),
            Text(
              _success!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.darkGreen, fontSize: 13),
            ),
          ],
          const SizedBox(height: 24),
          AuthPrimaryButton(
            label: s.get(_submitting ? 'auth.updatingPassword' : 'auth.updatePassword'),
            loading: _submitting,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
