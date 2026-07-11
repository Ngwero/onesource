import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../utils/auth_errors.dart';
import '../widgets/auth_shell.dart';
import '../widgets/auth_step_indicator.dart';
import '../widgets/password_strength_meter.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _otp = TextEditingController();
  bool _otpStep = false;
  bool _submitting = false;
  bool _showPassword = false;
  bool _rememberMe = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _submitCredentials() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(authServiceProvider).startLogin(_email.text, _password.text);
      if (!mounted) return;
      setState(() => _otpStep = true);
    } catch (e) {
      setState(() => _error = formatAuthError(e));
    } finally {
      setState(() => _submitting = false);
    }
  }

  Future<void> _submitOtp() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(authServiceProvider).verifyLoginOtp(_email.text, _otp.text);
      if (!mounted) return;
      context.go('/account');
    } catch (e) {
      setState(() => _error = formatAuthError(e));
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthShell(
      title: _otpStep ? 'Verify your code' : 'Welcome back',
      subtitle: _otpStep
          ? 'Enter the code we sent to ${_email.text}'
          : 'Sign in to track orders and checkout faster.',
      onBack: _otpStep
          ? () => setState(() {
                _otpStep = false;
                _otp.clear();
                _error = null;
              })
          : () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/home');
              }
            },
      footer: AuthFooterLink(
        prompt: "Don't have an account? ",
        action: 'Sign up',
        onTap: () => context.push('/signup'),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthStepIndicator(otpStep: _otpStep),
          const SizedBox(height: 24),
          if (!_otpStep) ...[
            AuthFormField(
              label: 'Email address',
              controller: _email,
              hint: 'example@gmail.com',
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
            ),
            const SizedBox(height: 18),
            AuthFormField(
              label: 'Password',
              controller: _password,
              obscureText: !_showPassword,
              autofillHints: const [AutofillHints.password],
              suffix: IconButton(
                icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                onPressed: () => setState(() => _showPassword = !_showPassword),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                SizedBox(
                  height: 24,
                  width: 24,
                  child: Checkbox(
                    value: _rememberMe,
                    activeColor: AppColors.darkGreen,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    onChanged: (v) => setState(() => _rememberMe = v ?? false),
                  ),
                ),
                const SizedBox(width: 8),
                const Text('Remember me', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                const Spacer(),
                TextButton(
                  onPressed: () => context.push('/forgot-password'),
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: const Text('Forgot password?', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ] else ...[
            AuthFormField(
              label: 'Verification code',
              controller: _otp,
              hint: '000000',
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              maxLength: 6,
              onChanged: (value) {
                final digits = value.replaceAll(RegExp(r'\D'), '');
                if (digits != value) {
                  _otp.value = TextEditingValue(
                    text: digits,
                    selection: TextSelection.collapsed(offset: digits.length),
                  );
                }
                setState(() {});
              },
              style: const TextStyle(fontSize: 22, letterSpacing: 6, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            const Text(
              'Enter the 6-digit code from your email. It expires in about 5 minutes.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.4),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 14),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red, fontSize: 13)),
          ],
          const SizedBox(height: 24),
          AuthPrimaryButton(
            label: _otpStep
                ? 'Verify & sign in'
                : 'Log in',
            loading: _submitting,
            onPressed: _otpStep
                ? (_otp.text.length == 6 ? _submitOtp : null)
                : _submitCredentials,
          ),
        ],
      ),
    );
  }
}

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _submitting = false;
  bool _showPassword = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_password.text != _confirm.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }
    if (_password.text.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
      _success = null;
    });

    try {
      final needsConfirm = await ref.read(authServiceProvider).signUp(
            email: _email.text,
            password: _password.text,
            fullName: _name.text,
          );
      if (needsConfirm) {
        setState(() => _success = 'Check your email to confirm your account.');
      } else if (mounted) {
        context.go('/account');
      }
    } catch (e) {
      setState(() => _error = formatAuthError(e));
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthShell(
      title: 'Create your account',
      subtitle: 'Join One Source for fresh produce delivered across Uganda.',
      onBack: () {
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/home');
        }
      },
      footer: AuthFooterLink(
        prompt: 'Already have an account? ',
        action: 'Log in',
        onTap: () => context.push('/login'),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthFormField(
            label: 'Full name',
            controller: _name,
            hint: 'Your name',
          ),
          const SizedBox(height: 18),
          AuthFormField(
            label: 'Email address',
            controller: _email,
            hint: 'example@gmail.com',
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 18),
          AuthFormField(
            label: 'Password',
            controller: _password,
            obscureText: !_showPassword,
            onChanged: (_) => setState(() {}),
            suffix: IconButton(
              icon: Icon(_showPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined),
              onPressed: () => setState(() => _showPassword = !_showPassword),
            ),
          ),
          PasswordStrengthMeter(password: _password.text),
          const SizedBox(height: 18),
          AuthFormField(
            label: 'Confirm password',
            controller: _confirm,
            obscureText: !_showPassword,
            onChanged: (_) => setState(() {}),
          ),
          if (_confirm.text.isNotEmpty && _password.text == _confirm.text) ...[
            const SizedBox(height: 8),
            const Text(
              'Passwords match.',
              style: TextStyle(fontSize: 12, color: AppColors.darkGreen, fontWeight: FontWeight.w600),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 14),
            Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red, fontSize: 13)),
          ],
          if (_success != null) ...[
            const SizedBox(height: 14),
            Text(_success!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.darkGreen, fontSize: 13)),
          ],
          const SizedBox(height: 24),
          AuthPrimaryButton(
            label: 'Create account',
            loading: _submitting,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool _submitting = false;
  String? _message;
  bool _isError = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _message = null;
      _isError = false;
    });
    try {
      await ref.read(authServiceProvider).requestPasswordReset(_email.text);
      setState(() {
        _message =
            'We\'ve sent a password reset link to your email. Check your inbox and spam folder.';
        _isError = false;
      });
    } on ApiException catch (e) {
      setState(() {
        _message = e.message;
        _isError = true;
      });
    } catch (e) {
      setState(() {
        _message = 'Could not send reset email. Please try again.';
        _isError = true;
      });
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthShell(
      title: 'Forgot password?',
      subtitle: 'Enter your email and we\'ll send you a reset link.',
      onBack: () => context.pop(),
      footer: AuthFooterLink(
        prompt: 'Remember your password? ',
        action: 'Log in',
        onTap: () => context.push('/login'),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthFormField(
            label: 'Email address',
            controller: _email,
            hint: 'example@gmail.com',
            keyboardType: TextInputType.emailAddress,
          ),
          if (_message != null) ...[
            const SizedBox(height: 14),
            Text(
              _message!,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _isError ? Colors.red : AppColors.darkGreen,
                fontSize: 13,
              ),
            ),
          ],
          const SizedBox(height: 24),
          AuthPrimaryButton(
            label: 'Send reset link',
            loading: _submitting,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
