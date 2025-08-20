# Swope (MVP)

App de shopping seconde main avec UI “swipe”, effet *Liquid Glass*, et Auth Supabase.  
Stack : Expo/React Native · Supabase (Auth/DB/Storage) · react-native-deck-swiper · expo-blur · expo-linear-gradient · expo-haptics.

---

## 🔗 Docs

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — structure, écrans, dépendances, contraintes UI
- [AUTH.md](docs/AUTH.md) — OTP 1ʳᵉ fois → mot de passe, OAuth Google/Facebook, redirects
- [CHANGELOG.md](docs/CHANGELOG.md) — journal des modifs

> Place ces fichiers dans un dossier `docs/` à la **racine** du repo (aux côtés de `App.js`, `package.json`, etc.).

---

## 🚀 Démarrage

**Prérequis**
- Node 18+  
- Expo CLI (via `npx expo`)  
- Git installé

**Installation**
```bash
npm i
npx expo install react-native-gesture-handler expo-blur expo-linear-gradient expo-haptics expo-image-picker
npm i react-native-deck-swiper @supabase/supabase-js
Lancer l’app

bash
Copier
Modifier
npx expo start
# puis choisir iOS Simulator / Android Emulator / Expo Go
🧱 Structure
bash
Copier
Modifier
.
├─ App.js
├─ src/
│  ├─ lib/supabase.js        # client Supabase
│  └─ theme/                 # tokens & provider (évolution)
├─ assets/                   # icônes/splash
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ AUTH.md
│  └─ CHANGELOG.md
├─ package.json
└─ app.json
🗄️ Base de données (Supabase)
Listings (déjà en place)
sql
Copier
Modifier
create table if not exists demo_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brand text,
  size text,
  price_cents int not null check (price_cents > 0),
  image text not null,
  status text default 'active' check (status in ('active','sold','paused')),
  created_at timestamptz default now()
);
Swipes (persistance MVP)
sql
Copier
Modifier
create table if not exists demo_swipes (
  user_id uuid not null,
  listing_id uuid not null,
  kind text not null check (kind in ('pass','favorite')),
  created_at timestamptz default now(),
  primary key (user_id, listing_id)
);
RLS à configurer plus tard (non couvert dans le MVP).

🔐 Auth (résumé)
1ʳᵉ connexion : e-mail → OTP (code) → définir un mot de passe (supabase.auth.updateUser)

Ensuite : e-mail + mot de passe (signInWithPassword)

OAuth : Google / Facebook via AuthSession (Expo proxy)

Supabase → Authentication → Email Templates : afficher {{ .Token }} dans le template pour recevoir un code plutôt qu’un lien magique (voir docs/AUTH.md).

🎨 UI & contraintes
Swiper ratio 3:4, parfaitement centré, marge ≈ 4% de chaque côté

Prefetch de l’image n+1, pas de flash n+2, aucun drift durant le swipe

Bandeau “Liquid Glass” sous la photo (blur + gradient), texte lisible

Boutons “Passer/Favori” style glass avec haptique

Thème : Light/Dark + “Système”, respect strict de colors.bg / card / text / border

Critères d’acceptation (feed)

Carte parfaitement centrée (≈ 4% de marge latérale)

Hauteur = largeur × 4/3 exactement

Aucun décalage pendant le swipe

Aucun flash de l’image n+2

Bandeau Liquid Glass centré, symétrique, halo visible tout autour (quand activé)

Ancres de patch (pour les diffs ciblés)
Dans App.js, ces balises entourent les zones clés pour nos patchs :

css
Copier
Modifier
[SWOPE_FILTERS:START] ... [SWOPE_FILTERS:END]
[SWOPE_DECK:START]    ... [SWOPE_DECK:END]
[SWOPE_GLASS:START]   ... [SWOPE_GLASS:END]
[SWOPE_ACTIONS:START] ... [SWOPE_ACTIONS:END]
🧑‍💻 Développement & Git
Cycle quotidien

bash
Copier
Modifier
git pull          # récupère les dernières modifs
# ... dev ...
git add -A
git commit -m "feat: description claire"
git push
Branches (si besoin)

main stable ; features en feat/* ; correctifs en fix/*

🛠️ Dépannage rapide
Clavier iOS qui se ferme à chaque frappe : éviter de recréer les écrans dans les callbacks des tabs (pas de remount).

Fond blanc en dark : forcer sceneContainerStyle={{ backgroundColor: colors.bg }} + wrappers d’écran backgroundColor: colors.bg.

Hermes “isDark undefined” : ne pas référencer isDark dans les callbacks de rendu des tabs ; préférer colors.blurTint === 'dark'.

Swiper “length of undefined” : clamp d’index, rendu conditionnel, onSwipedAll.

📦 Secrets
Ne pas commiter de secrets. .env est ignoré via .gitignore.
src/lib/supabase.js utilise l’URL et l’anon key publiques (OK côté client).
Ne jamais commiter de service role key.

📍 Roadmap (extrait)
Favoris/Passer persistants (UI + DB)

Auth : UX “définir mot de passe” après OTP (finalisation)

Design tokens & accessibilité

États d’erreur/offline + skeletons

Navigation (stack + tabs) + écrans dédiés