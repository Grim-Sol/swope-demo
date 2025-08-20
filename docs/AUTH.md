# Auth Swope — OTP 1ʳᵉ fois + Password + OAuth

## 1) Providers activés (Supabase)
- **Email** (sign-in with password **et** OTP)
- **OAuth** : Google, Facebook
- (Option) Confirmation email pour `signUp` si désiré.

## 2) OTP en “code” (et pas “magic link”)
- Dashboard Supabase → **Authentication → Email Templates**.
- Dans le template “Magic Link”, **afficher** le code via `{{ .Token }}` et retirer le lien.
  Exemple :
  ```html
  <h2>Votre code Swope</h2>
  <p>Entrez ce code dans l’app : <strong>{{ .Token }}</strong></p>
