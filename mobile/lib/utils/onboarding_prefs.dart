import 'package:shared_preferences/shared_preferences.dart';

const _onboardingDoneKey = 'onesource_onboarding_done_v4';

Future<bool> isOnboardingDone() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool(_onboardingDoneKey) ?? false;
}

Future<void> setOnboardingDone() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool(_onboardingDoneKey, true);
}
