# Swope — Architecture (MVP)

## 1. Stack & dépendances
- **App** : Expo / React Native
- **UI swipe** : `react-native-deck-swiper` (pile centrée, ratio 4:3)
- **Effet “Liquid Glass”** : `expo-blur` + `expo-linear-gradient`
- **Haptique** : `expo-haptics`
- **Auth & DB** : Supabase (`@supabase/supabase-js`)
- **Images** : Supabase Storage (bucket `listing-images`)
- **Navigation** : `@react-navigation/native` + bottom tabs
- **Gestures** : `react-native-gesture-handler` (importé en 1ère ligne)

## 2. Écrans (tabs)
- **Feed (“Découvrir”)**
  - Barre de filtres (marque, taille) → taxonomie fixe (MVP).
  - Deck Swiper (ratio 3:4, centré) ; prefetch de l’image n+1 ; pas de flash n+2.
  - Bandeau “Liquid Glass” **sous** la photo (image floutée + blur + gradient).
  - Gros boutons “Passer” (rouge) / “Favori” (bleu) style “glass”.
  - États : *loading*, *empty (no cards)*, *create mode*.
- **Account (“Compte”)**
  - Non connecté : OAuth Google/Facebook, OTP (1ʳᵉ fois), puis **set password**.
  - Connecté : infos de session + “Se déconnecter”.

## 3. Thème & tokens
- Détection `useColorScheme()` + préférence utilisateur (`system | light | dark`).
- Couleurs dérivées : `colors.bg`, `colors.card`, `colors.text`, `colors.border`, etc.
- `colors.blurTint` = `'light' | 'dark'` (sert pour le rendu *glass* dans le JSX).

## 4. Données & persistance
- Table **`demo_listings`** :
  - `id uuid pk`, `title text`, `brand text`, `size text`,
  - `price_cents int`, `image text`, `status enum('active','sold','paused')`, `created_at timestamptz`.
- Table **`demo_swipes`** (MVP persistance) :
  - `user_id uuid`, `listing_id uuid`, `kind enum('pass','favorite')`, upsert sur `(user_id, listing_id)`.

## 5. Flux Auth (résumé)
- **OTP (email)** pour 1ʳᵉ connexion (template email doit afficher `{{ .Token }}`).
- **Set password** juste après OTP (via `supabase.auth.updateUser`).
- **Sign in** suivants via **email + mot de passe**.
- **OAuth** : Google / Facebook via `AuthSession` (proxy Expo).

## 6. Perf & UX
- **Prefetch** image n+1 sur change d’index.
- **Clavier iOS** : éviter remount (tabs constants, pas de screens déclarés inline dans `App()` si ça recrée le comp).
- **Deck** : jamais d’index hors-borne ; rendu conditionnel ; `onSwipedAll` gère fin de pile.
- **Accessibilité** : gros tap targets, labels, contraste texte sur *glass*.

## 7. Ancres de patch (pour refactor rapide)
- `// [SWOPE_FILTERS:START]` … `// [SWOPE_FILTERS:END]`
- `// [SWOPE_DECK:START]` … `// [SWOPE_DECK:END]`
- `// [SWOPE_GLASS:START]` … `// [SWOPE_GLASS:END]`
- `// [SWOPE_ACTIONS:START]` … `// [SWOPE_ACTIONS:END]`
