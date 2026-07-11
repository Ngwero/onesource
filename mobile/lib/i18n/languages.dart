enum LanguageCode { en, fr, sw, ln, rw }

const defaultLanguage = LanguageCode.en;
const languageStorageKey = 'amazon-uk-clone-lang';

class LanguageInfo {
  const LanguageInfo({
    required this.code,
    required this.flag,
    required this.nativeName,
    required this.labelKey,
  });

  final LanguageCode code;
  final String flag;
  final String nativeName;
  final String labelKey;
}

const languages = <LanguageInfo>[
  LanguageInfo(code: LanguageCode.en, flag: '🇬🇧', nativeName: 'English', labelKey: 'lang.en'),
  LanguageInfo(code: LanguageCode.fr, flag: '🇫🇷', nativeName: 'Français', labelKey: 'lang.fr'),
  LanguageInfo(code: LanguageCode.sw, flag: '🇹🇿', nativeName: 'Kiswahili', labelKey: 'lang.sw'),
  LanguageInfo(code: LanguageCode.ln, flag: '🇨🇩', nativeName: 'Lingála', labelKey: 'lang.ln'),
  LanguageInfo(code: LanguageCode.rw, flag: '🇷🇼', nativeName: 'Ikinyarwanda', labelKey: 'lang.rw'),
];

LanguageCode languageCodeFromString(String? raw) {
  switch (raw) {
    case 'fr':
      return LanguageCode.fr;
    case 'sw':
      return LanguageCode.sw;
    case 'ln':
      return LanguageCode.ln;
    case 'rw':
      return LanguageCode.rw;
    default:
      return LanguageCode.en;
  }
}

String languageCodeLabel(LanguageCode code) => code.name;

LanguageInfo languageInfo(LanguageCode code) {
  return languages.firstWhere((l) => l.code == code, orElse: () => languages.first);
}
