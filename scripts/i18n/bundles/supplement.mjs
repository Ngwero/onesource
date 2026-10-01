/**
 * Strings added to en.json after the main bundles were written (OTP login,
 * password strength, export form placeholders). Merged after each language's
 * main bundle by scripts/build-locales.mjs.
 */
const rows = {
  "auth.fullNamePlaceholder": ["Votre nom", "Jina lako", "Nkombo na yo", "Izina ryawe"],
  "auth.otpHint": [
    "Saisissez le code à 6–8 chiffres reçu par e-mail. Il expire dans environ 5 minutes.",
    "Weka msimbo wa tarakimu 6–8 kutoka kwenye barua pepe yako. Unaisha baada ya takriban dakika 5.",
    "Koma code ya mituya 6–8 oyo ozwi na e-mail. Ekosila nsima ya miniti 5 boye.",
    "Andika kode y'imibare 6–8 yaje kuri imeyili yawe. Irangira nyuma y'iminota nka 5.",
  ],
  "auth.otpLabel": ["Code à usage unique (OTP)", "Msimbo wa mara moja (OTP)", "Code ya mbala moko (OTP)", "Kode y'inshuro imwe (OTP)"],
  "auth.otpSubtitle": [
    "Nous avons envoyé un code de vérification à {{email}}. Il expire dans 5 minutes.",
    "Tumetuma msimbo wa uthibitisho kwa {{email}}. Unaisha baada ya dakika 5.",
    "Totindi code ya kondimisa na {{email}}. Ekosila nsima ya miniti 5.",
    "Twohereje kode yo kwemeza kuri {{email}}. Irangira nyuma y'iminota 5.",
  ],
  "auth.otpTitle": ["Saisissez votre code de connexion", "Weka msimbo wako wa kuingia", "Koma code na yo ya kokota", "Andika kode yawe yo kwinjira"],
  "auth.passwordStrengthWeak": [
    "Faible — ajoutez des majuscules, des chiffres ou des symboles.",
    "Dhaifu — ongeza herufi kubwa, namba au alama.",
    "Ya pete — bakisa minkoko ya minene, mituya to bilembo.",
    "Ntirikomeye — ongeramo inyuguti nkuru, imibare cyangwa ibimenyetso.",
  ],
  "auth.passwordStrengthFair": [
    "Moyen — essayez un mot de passe plus long avec des chiffres.",
    "Wastani — jaribu nenosiri refu zaidi lenye namba.",
    "Ya katikati — meka mot de passe ya molai na mituya.",
    "Riringaniye — gerageza ijambo ry'ibanga rirerire ririmo imibare.",
  ],
  "auth.passwordStrengthGood": ["Bon mot de passe.", "Nenosiri zuri.", "Mot de passe ya malamu.", "Ijambo ry'ibanga ryiza."],
  "auth.passwordStrengthStrong": ["Mot de passe robuste.", "Nenosiri imara.", "Mot de passe ya makasi.", "Ijambo ry'ibanga rikomeye."],
  "auth.passwordsMatch": [
    "Les mots de passe correspondent.",
    "Nenosiri zinalingana.",
    "Ba mot de passe ekokani.",
    "Amagambo y'ibanga arahuye.",
  ],
  "auth.stepCredentials": ["Connexion", "Ingia", "Kokota", "Kwinjira"],
  "auth.stepVerify": ["Vérifier le code", "Thibitisha msimbo", "Ndimisa code", "Emeza kode"],
  "auth.verifyOtp": ["Vérifier et se connecter", "Thibitisha na uingie", "Ndimisa mpe kota", "Emeza winjire"],
  "errors.emailNotRegistered": [
    "Aucun compte n'est enregistré avec cet e-mail. Vérifiez l'orthographe ou créez un compte.",
    "Hakuna akaunti iliyosajiliwa kwa barua pepe hii. Kagua makosa ya tahajia au jisajili upya.",
    "Compte moko te ekomami na e-mail oyo. Tala soki ezali na libunga to komikomisa.",
    "Nta konti yanditswe kuri iyi imeyili. Genzura amakosa cyangwa wiyandikishe.",
  ],
  "errors.otpInvalid": [
    "Code de connexion invalide ou expiré",
    "Msimbo wa kuingia si sahihi au umeisha muda",
    "Code ya kokota ezali malamu te to esili",
    "Kode yo kwinjira si yo cyangwa yarangiye",
  ],
  "errors.otpSessionExpired": [
    "Votre code de connexion a expiré. Reconnectez-vous pour en recevoir un nouveau.",
    "Msimbo wako wa kuingia umeisha muda. Ingia tena kupata msimbo mpya.",
    "Code na yo ya kokota esili. Kota lisusu mpo na kozwa code ya sika.",
    "Kode yawe yo kwinjira yarangiye. Ongera winjire ubone indi nshya.",
  ],
  "exports.confirmation.addressPlaceholder": [
    "Entrepôt, marché ou terminal de fret aérien",
    "Ghala, soko au kituo cha mizigo cha uwanja wa ndege",
    "Ndako ya biloko, zando to esika ya biloko na libanda ya mpepo",
    "Ububiko, isoko cyangwa aho imizigo yo ku kibuga cy'indege yakirirwa",
  ],
  "exports.confirmation.buyerHint": [
    "Comment notre service export doit vous contacter.",
    "Jinsi ofisi yetu ya mauzo ya nje itakavyowasiliana nawe.",
    "Ndenge biro na biso ya export ekobenga yo.",
    "Uko ibiro byacu by'ubucuruzi bwo hanze bizakuvugisha.",
  ],
  "exports.confirmation.cityPlaceholder": ["Ville ou port d'entrée", "Jiji au bandari ya kuingia", "Engumba to libongo ya kokota", "Umujyi cyangwa icyambu cyinjirirwamo"],
  "exports.confirmation.companyPlaceholder": [
    "Société de négoce (facultatif)",
    "Kampuni ya biashara (si lazima)",
    "Kompani ya mombongo (ezali na ntina te)",
    "Ikigo cy'ubucuruzi (si ngombwa)",
  ],
  "exports.confirmation.countryPlaceholder": ["ex. Royaume-Uni", "mf. Uingereza", "ndakisa Angleterre", "urugero: Ubwongereza"],
  "exports.confirmation.destinationHint": [
    "Où l'envoi doit arriver.",
    "Mahali mzigo unapaswa kufika.",
    "Esika biloko esengeli kokoma.",
    "Aho imizigo igomba kugera.",
  ],
  "exports.confirmation.emailPlaceholder": ["acheteur@entreprise.com", "mnunuzi@kampuni.com", "mosombi@kompani.com", "umuguzi@ikigo.com"],
  "exports.confirmation.namePlaceholder": [
    "Nom de l'acheteur ou du contact",
    "Jina la mnunuzi au mtu wa mawasiliano",
    "Nkombo ya mosombi to moto ya kobenga",
    "Izina ry'umuguzi cyangwa uwo kuvugisha",
  ],
  "exports.confirmation.phonePlaceholder": [
    "+256 ou numéro international",
    "+256 au namba ya kimataifa",
    "+256 to nimero ya mokili mobimba",
    "+256 cyangwa nimero mpuzamahanga",
  ],
  "exports.confirmation.requirementsPlaceholder": [
    "ex. GlobalGAP, certificat phytosanitaire, chaîne du froid, taille des palettes",
    "mf. GlobalGAP, cheti cha afya ya mimea, mnyororo wa baridi, ukubwa wa paleti",
    "ndakisa GlobalGAP, mokanda ya bokolongono ya milona, malili, monene ya palette",
    "urugero: GlobalGAP, icyemezo cy'ubuzima bw'ibimera, gukonjesha, ingano ya paleti",
  ],
};

function build(index) {
  const out = {};
  for (const [key, values] of Object.entries(rows)) {
    const parts = key.split(".");
    let node = out;
    for (const part of parts.slice(0, -1)) node = node[part] ??= {};
    node[parts.at(-1)] = values[index];
  }
  return out;
}

export const supplement = { fr: build(0), sw: build(1), ln: build(2), rw: build(3) };
