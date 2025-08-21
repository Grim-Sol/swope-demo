// (stray closing tags removed)
import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, View, Text, Image, StyleSheet, TouchableOpacity, Modal, Pressable, FlatList, ActivityIndicator, TextInput, ScrollView, Alert, useColorScheme, Dimensions } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from './src/lib/supabase';

// Safe length utility
const len = (v) => (Array.isArray(v) ? v.length : (v?.length ?? 0));

// Tab navigator instance (module scope)
const Tab = createBottomTabNavigator();

// Expo AuthSession proxy completion
WebBrowser.maybeCompleteAuthSession();
// App.js — Swope (Deck centré via react-native-deck-swiper, image parfaitement centrée, haptique, dropdowns)
// Prérequis :
//   npx expo install react-native-gesture-handler expo-blur expo-linear-gradient expo-haptics expo-image-picker
//   npm i react-native-deck-swiper react-native-shadow-2 @supabase/supabase-js
//   (Reanimated n'est pas requis dans cette version)


/* ────────────────────────────────────────────────────────────────────────────
   Sélecteur de thème (Système/Clair/Sombre)
   ──────────────────────────────────────────────────────────────────────────── */
function ThemeSelector({ pref, setPref, colors }) {
  const Opt = ({ k, label }) => (
    <TouchableOpacity
      onPress={() => setPref(k)}
      style={{
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
        borderWidth: 1, borderColor: colors.border,
        backgroundColor: pref === k
          ? (colors.blurTint === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)')
          : (colors.blurTint === 'dark' ? 'rgba(255,255,255,0.06)' : 'transparent'),
        marginRight: 8
      }}>
      <Text style={{ color: colors.text }}>{label}</Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', marginBottom: 8 }}>
      <Opt k="system" label="Système" />
      <Opt k="light"  label="Clair" />
      <Opt k="dark"   label="Sombre" />
    </View>
  );
}

/* ───────── Taxonomie fixe (MVP) ───────── */
const TAXONOMY = {
  brands: ["Zara", "Levi's", "COS", "H&M", "Uniqlo", "Nike", "Adidas"],
  sizes: [
    'FR 32','FR 34','FR 36','FR 38','FR 40','FR 42','FR 44','FR 46',
    'XS','S','M','L','XL','XXL'
  ]
};

/* ───────── Dropdown modal réutilisable ───────── */
function DropdownModal({ visible, onClose, title, options, selected, onSelect, colors }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)' }} onPress={onClose}>
        <View style={{
          marginTop: 'auto', backgroundColor: colors.card, borderTopLeftRadius: 16, borderTopRightRadius: 16,
          padding: 16, maxHeight: '60%'
        }}>
          <Text style={{ color: colors.text, fontWeight:'700', fontSize:16, marginBottom: 8 }}>{title}</Text>
          <FlatList
            data={options || []}
            keyExtractor={(it) => String(it)}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => { onSelect(item); onClose(); }}
                style={{ paddingVertical: 12 }}
              >
                <Text style={{ color: colors.text, fontWeight: selected === item ? '800' : '400' }}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height:1, backgroundColor: colors.border }}/>} 
          />
        </View>
      </Pressable>
    </Modal>
  );
}

/* Petit “champ” cliquable pour ouvrir le dropdown */
function FilterField({ label, value, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1,
        borderColor: colors.border,
  backgroundColor: colors.blurTint === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        marginRight: 8
      }}
      activeOpacity={0.85}
    >
      <Text style={{ color: colors.text }}>
        {value ? `${label}: ${value}` : label}
      </Text>
    </TouchableOpacity>
  );
}

export default function App() {
  // AUTH STATES & LISTENERS
  const [user, setUser] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setUser(data?.user ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { sub?.subscription?.unsubscribe?.(); mounted = false; };
  }, []);


  // Onglet/mode Auth
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup' | 'otp-first' | 'set-password'

  // Email + Password
  const [authEmail, setAuthEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [authStage, setAuthStage] = useState('request'); // 'request' | 'verify'
  const [authLoading, setAuthLoading] = useState(false);

  // Après OTP, on propose de définir un mot de passe
  function goSetPassword() {
    setPassword('');
    setPassword2('');
    setAuthMode('set-password');
  }

  async function signUpWithEmailPassword() {
    if (!authEmail || !password) {
      Alert.alert('Champs requis', 'Email et mot de passe sont requis.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Mot de passe', '8 caractères minimum.');
      return;
    }
    try {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
      });
      if (error) throw error;
      Alert.alert(
        'Compte créé',
        'Si la confirmation email est activée, vérifie ta boîte mail. Sinon, tu es connecté.'
      );
      setAuthMode('signin');
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? 'Inscription impossible.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function signInWithEmailPassword() {
    if (!authEmail || !password) {
      Alert.alert('Champs requis', 'Email et mot de passe sont requis.');
      return;
    }
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });
      if (error) throw error;
      // onAuthStateChange mettra user à jour
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? 'Connexion impossible.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function setPasswordAfterOtp() {
    if (!password || password !== password2) {
      Alert.alert('Mot de passe', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Mot de passe', '8 caractères minimum.');
      return;
    }
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert('OK', 'Mot de passe défini. Vous pourrez vous reconnecter avec email + mot de passe.');
      setAuthMode('signin');
      setPassword('');
      setPassword2('');
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de définir le mot de passe.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function requestEmailOtp() {
    if (!authEmail) { Alert.alert('Email requis'); return; }
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: authEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      Alert.alert('Code envoyé ✅', `Un code a été envoyé à ${authEmail}`);
      setAuthStage('verify');
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d’envoyer le code.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function verifyEmailOtp() {
    if (!authEmail || !otpToken) { Alert.alert('Code requis'); return; }
    try {
      setAuthLoading(true);
      const { error } = await supabase.auth.verifyOtp({
        email: authEmail,
        token: otpToken,
        type: 'email',
      });
      if (error) throw error;
      setOtpToken('');
      setAuthStage('request');
      Alert.alert('Connecté ✅', 'Définis un mot de passe pour les prochaines connexions.');
      goSetPassword();
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? 'Code invalide.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      setAuthEmail(''); setOtpToken(''); setAuthStage('request');
    } catch {}
  }

  // OAUTH Google/Facebook
  const OAUTH_REDIRECT = AuthSession.makeRedirectUri({ useProxy: true });
  async function oauthSignIn(provider) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider, // 'google' | 'facebook'
        options: { redirectTo: OAUTH_REDIRECT }
      });
      if (error) throw error;
      const authUrl = data?.url;
      if (!authUrl) throw new Error('URL OAuth manquante');
      await AuthSession.startAsync({ authUrl, returnUrl: OAUTH_REDIRECT });
      // La session est gérée via onAuthStateChange
    } catch (e) {
      Alert.alert('Connexion impossible', e?.message ?? 'Erreur OAuth');
    }
  }

  // SWIPES PERSISTENCE
  const [passedIds, setPassedIds] = useState(new Set());
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  async function loadUserSwipes() {
    if (!user?.id) { setPassedIds(new Set()); setFavoriteIds(new Set()); return; }
    try {
      const { data, error } = await supabase
        .from('demo_swipes')
        .select('listing_id, kind');
      if (error) throw error;
      const p = new Set(); const f = new Set();
      for (const row of data || []) {
        if (row.kind === 'pass') p.add(row.listing_id);
        if (row.kind === 'favorite') f.add(row.listing_id);
      }
      setPassedIds(p);
      setFavoriteIds(f);
      setIndex(0);
    } catch (e) {
      console.warn('loadUserSwipes error', e);
    }
  }
  useEffect(() => { loadUserSwipes(); }, [user?.id, len(items)]);

  async function recordSwipeByUser(kind, listingId) {
    try {
      if (!user?.id) {
        Alert.alert('Connexion requise', 'Connecte-toi pour enregistrer tes favoris et passes.');
        return;
      }
      const { error } = await supabase
        .from('demo_swipes')
        .upsert({ user_id: user.id, listing_id: listingId, kind }, { onConflict: 'user_id,listing_id' });
      if (error) throw error;
      // Mise à jour optimiste
      if (kind === 'pass') setPassedIds(prev => new Set(prev).add(listingId));
      if (kind === 'favorite') setFavoriteIds(prev => new Set(prev).add(listingId));
    } catch (e) {
      console.warn('recordSwipeByUser error', e);
    }
  }
  // FeedScreen: deck complet, filtres, bandeau, boutons glass

  /* Thème */
  const scheme = useColorScheme();
  const [themePref, setThemePref] = useState('system'); // 'system' | 'light' | 'dark'
  const isDark = themePref === 'dark' || (themePref === 'system' && scheme === 'dark'); // [SWOPE_THEME: legacy, do not use in JSX]
  const blurTint = isDark ? 'dark' : 'light';
  const colors = {
    blurTint,
    bg:        blurTint === 'dark' ? '#111111' : '#FAFAFA',
    card:      blurTint === 'dark' ? '#1C1C1E' : '#FFFFFF',
    text:      blurTint === 'dark' ? '#FFFFFF' : '#111111',
    textMuted: blurTint === 'dark' ? 'rgba(255,255,255,0.7)' : '#555555',
    border:    blurTint === 'dark' ? '#2A2A2A' : '#E5E5E5',
    // Boutons (intuitifs)
    passBg:   '#FF3B30', passText: '#FFFFFF',   // rouge iOS
    likeBg:   '#0A84FF', likeText: '#FFFFFF',   // bleu iOS
    buyBg:    '#34C759', buyText:  '#FFFFFF',   // vert iOS (pour plus tard)
  };

  /* Données / UI */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view'); // 'view' | 'create'

  // Filtres (fixes)
  const [brandFilter, setBrandFilter] = useState(null);
  const [sizeFilter, setSizeFilter] = useState(null);
  const [brandPickerOpen, setBrandPickerOpen] = useState(false);
  const [sizePickerOpen, setSizePickerOpen] = useState(false);

  // Swipe deck (via Swiper)
  const [index, setIndex] = useState(0);
  const swiperRef = useRef(null);

  // Formulaire (create)
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [createBrand, setCreateBrand] = useState(null);
  const [createSize, setCreateSize] = useState(null);
  const [pickedImage, setPickedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [brandCreateOpen, setBrandCreateOpen] = useState(false);
  const [sizeCreateOpen, setSizeCreateOpen] = useState(false);

  /* Haptique helpers */
  const hapticSelection = () => Haptics.selectionAsync();
  const hapticTap       = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const hapticCommit    = (dir) => {
    const type = dir > 0
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Warning;
    return Haptics.notificationAsync(type);
  };

  /* Chargement Supabase */
  async function fetchItems() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('demo_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
      setIndex(0);
    } catch (e) {
      console.error('Supabase error:', e);
      Alert.alert('Erreur', 'Impossible de charger les articles.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { fetchItems(); }, []);

  const feedItems = useMemo(() => {
    return (items || []).filter(i =>
      (brandFilter ? i.brand === brandFilter : true) &&
      (sizeFilter ? i.size === sizeFilter : true) &&
      !passedIds.has(i.id)
    );
  }, [items, brandFilter, sizeFilter, passedIds]);

  // Reset index quand filtres changent
  useEffect(() => {
    setIndex(0);
  }, [brandFilter, sizeFilter]);

  const hasCards = Array.isArray(feedItems) && feedItems.length > 0;
  const inRange  = hasCards && index < feedItems.length;

  const current  = inRange ? feedItems[index] : null;
  const nextItem = inRange && (index + 1 < feedItems.length) ? feedItems[index + 1] : null;
  // Pré-charger uniquement l'image n+1 (nextItem)
  useEffect(() => {
    if (nextItem?.image) Image.prefetch(nextItem.image);
  }, [index, feedItems]);

  // Si les données changent et que l’index est hors-borne, on le recadre
  useEffect(() => {
    if (index >= len(feedItems) && len(feedItems) > 0) {
      setIndex(len(feedItems) - 1);
    }
  }, [len(feedItems)]);

  // Swiper ref for manual swipe
  // (duplicate declaration removed)

  function manualSwipe(dir = 1) {
    if (!swiperRef.current) return;
    hapticTap(); // feedback immédiat au tap sur le bouton
    if (dir > 0) swiperRef.current.swipeRight();
    else swiperRef.current.swipeLeft();
  }

  /* Choisir image (form) */
  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "Autorise l'accès aux photos pour continuer.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 5]
    });
    if (!res.canceled) setPickedImage({ uri: res.assets[0].uri });
  }

  /* Upload + insert */
  async function uploadImageAndInsert() {
    if (!pickedImage || !title || !price) {
      Alert.alert('Champs manquants', 'Photo, titre et prix sont requis.');
      return;
    }
    setSubmitting(true);
    try {
      const uri = pickedImage.uri;
      const resp = await fetch(uri);
      const arrayBuffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const extGuess = (uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
      const ext = ['jpg','jpeg','png','webp'].includes(extGuess) ? extGuess : 'jpg';
      const contentType =
        ext === 'png'  ? 'image/png' :
        ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const filePath = `demo/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase
        .storage.from('listing-images')
        .upload(filePath, bytes, { contentType, upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('listing-images').getPublicUrl(filePath);
      const imageUrl = pub.publicUrl;

      const priceCents = Math.round(parseFloat(price.replace(',', '.')) * 100);
      if (!Number.isFinite(priceCents) || priceCents <= 0) throw new Error('Prix invalide');


      const { error: insErr } = await supabase
        .from('demo_listings')
        .insert({
          title,
          brand: createBrand || null,
          size:  createSize  || null,
          price_cents: priceCents,
          image: imageUrl,
          status: 'active'
        });
      if (insErr) throw insErr;

      setTitle(''); setPrice(''); setPickedImage(null);
      setCreateBrand(null); setCreateSize(null);
      await fetchItems();
      setMode('view');
      Alert.alert('Publié ✅', 'Ton article a été ajouté');
    } catch (e) {
      console.error('UPLOAD/INSERT ERROR:', e);
      Alert.alert('Erreur', e.message || 'Impossible de publier.');
    } finally {
      setSubmitting(false);
    }
  }


  // Theme setup (fix for ReferenceError: 'colors' doesn't exist)
  // Use the existing themePref, colors, and theme logic already present in the component.
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}> 
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
                tabBarActiveTintColor: colors.text,
                tabBarInactiveTintColor: colors.textMuted,
                sceneContainerStyle: { backgroundColor: colors.bg },
              }}
              detachInactiveScreens={false}
            >
              <Tab.Screen name="Feed" options={{ title: 'Découvrir' }}>
                {() => {
                  const theme = colors;
                  const dark  = (theme.blurTint === 'dark');
                  const Stack = createNativeStackNavigator();

                  // ÉTATS LOCAUX (connexion + inscription)
                  const [loginEmail, setLoginEmail]       = React.useState('');
                  const [loginPassword, setLoginPassword] = React.useState('');
                  const [regEmail, setRegEmail]           = React.useState('');
                  const [regPassword, setRegPassword]     = React.useState('');
                  const [regCode, setRegCode]             = React.useState('');
                  const [regStage, setRegStage]           = React.useState('form'); // 'form' | 'code'
                  const [authLoading, setAuthLoading]     = React.useState(false);

                  async function doLogin() {
                    try {
                      setAuthLoading(true);
                      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
                      if (error) throw error;
                    } catch (e) {
                      Alert.alert('Erreur', e?.message ?? 'Connexion impossible');
                    } finally {
                      setAuthLoading(false);
                    }
                  }

                  async function startRegister() {
                    if (!regEmail || !regPassword) { Alert.alert('Champs requis', 'Email et mot de passe'); return; }
                    try {
                      setAuthLoading(true);
                      const { error } = await supabase.auth.signInWithOtp({
                        email: regEmail,
                        options: { shouldCreateUser: true },
                      });
                      if (error) throw error;
                      Alert.alert('Code envoyé ✅', `Un code a été envoyé à ${regEmail}`);
                      setRegStage('code');
                    } catch (e) {
                      Alert.alert('Erreur', e?.message ?? 'Impossible d’envoyer le code');
                    } finally {
                      setAuthLoading(false);
                    }
                  }

                  async function verifyRegister(navigation) {
                }

                function LoginScreen({ navigation }) {
                  return (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="none"
                      contentContainerStyle={{ paddingBottom: 40 }}
                      style={{ backgroundColor: theme.bg }}
                    >
                      <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
                        Se connecter
                      </Text>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <TouchableOpacity
                          onPress={() => oauthSignIn('google')}
                          style={[styles.btn, { backgroundColor: theme.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, marginRight: 8 }]}
                          activeOpacity={0.85}
                        >
                          <Text style={{ color: theme.text, fontWeight: '700' }}>Continuer avec Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => oauthSignIn('facebook')}
                          style={[styles.btn, { backgroundColor: theme.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}
                          activeOpacity={0.85}
                        >
                          <Text style={{ color: theme.text, fontWeight: '700' }}>Facebook</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={{ color: theme.textMuted, marginVertical: 4, textAlign: 'center' }}>— ou —</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        placeholder="Email" placeholderTextColor={theme.textMuted}
                        autoCapitalize="none" autoCorrect={false}
                        textContentType="emailAddress" autoComplete="email"
                        value={loginEmail} onChangeText={setLoginEmail}
                      />
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        placeholder="Mot de passe" placeholderTextColor={theme.textMuted}
                        secureTextEntry textContentType="password" autoComplete="password"
                        value={loginPassword} onChangeText={setLoginPassword}
                      />
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: theme.likeBg }]}
                        onPress={doLogin} disabled={authLoading}
                      >
                        <Text style={{ color: theme.likeText, fontWeight: '700' }}>Se connecter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ alignSelf:'center', marginTop: 12 }}
                        onPress={() => navigation.navigate('Register')}
                      >
                        <Text style={{ color: theme.likeBg, fontWeight: '700' }}>Créer son compte</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  );
                }

                function RegisterScreen({ navigation }) {
                  return (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="none"
                      contentContainerStyle={{ paddingBottom: 40 }}
                      style={{ backgroundColor: theme.bg }}
                    >
                      <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
                        Créer un compte
                      </Text>
                      {regStage === 'form' ? (
                        <>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                            placeholder="Email" placeholderTextColor={theme.textMuted}
                            autoCapitalize="none" autoCorrect={false}
                            textContentType="emailAddress" autoComplete="email"
                            value={regEmail} onChangeText={setRegEmail}
                          />
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                            placeholder="Mot de passe" placeholderTextColor={theme.textMuted}
                            secureTextEntry textContentType="newPassword" autoComplete="new-password"
                            value={regPassword} onChangeText={setRegPassword}
                          />
                          <TouchableOpacity
                            style={[styles.btn, { backgroundColor: theme.likeBg }]}
                            onPress={startRegister} disabled={authLoading}
                          >
                            <Text style={{ color: theme.likeText, fontWeight: '700' }}>Envoyer le code</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{ alignSelf:'center', marginTop: 12 }}
                            onPress={() => navigation.replace('Login')}
                          >
                            <Text style={{ color: theme.textMuted }}>J’ai déjà un compte</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                            placeholder="Code à 6 chiffres" placeholderTextColor={theme.textMuted}
                            keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code"
                            value={regCode} onChangeText={setRegCode} maxLength={6}
                          />
                          <View style={{ flexDirection:'row', gap: 12 }}>
                            <TouchableOpacity
                              style={[styles.btn, { backgroundColor: theme.passBg }]}
                              onPress={() => { setRegStage('form'); setRegCode(''); }}
                              disabled={authLoading}
                            >
                              <Text style={{ color: theme.passText, fontWeight: '700' }}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.btn, { backgroundColor: theme.likeBg }]}
                              onPress={() => verifyRegister(navigation)} disabled={authLoading}
                            >
                              <Text style={{ color: theme.likeText, fontWeight: '700' }}>Valider</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </ScrollView>
                  );
                }
                  return (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="none"
                      contentContainerStyle={{ paddingBottom: 40 }}
                      style={{ backgroundColor: theme.bg }}
                    >
                      <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
                        Se connecter
                      </Text>

                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <TouchableOpacity
                          onPress={() => oauthSignIn('google')}
                          style={[styles.btn, { backgroundColor: theme.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, marginRight: 8 }]}
                          activeOpacity={0.85}
                        >
                          <Text style={{ color: theme.text, fontWeight: '700' }}>Continuer avec Google</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => oauthSignIn('facebook')}
                          style={[styles.btn, { backgroundColor: theme.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}
                          activeOpacity={0.85}
                        >
                          <Text style={{ color: theme.text, fontWeight: '700' }}>Facebook</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={{ color: theme.textMuted, marginVertical: 4, textAlign: 'center' }}>— ou —</Text>

                      <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        placeholder="Email" placeholderTextColor={theme.textMuted}
                        autoCapitalize="none" autoCorrect={false}
                        textContentType="emailAddress" autoComplete="email"
                        value={loginEmail} onChangeText={setLoginEmail}
                      />
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        placeholder="Mot de passe" placeholderTextColor={theme.textMuted}
                        secureTextEntry textContentType="password" autoComplete="password"
                        value={loginPassword} onChangeText={setLoginPassword}
                      />
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: theme.likeBg }]}
                        onPress={doLogin} disabled={authLoading}
                      >
                        <Text style={{ color: theme.likeText, fontWeight: '700' }}>Se connecter</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ alignSelf:'center', marginTop: 12 }}
                        onPress={() => navigation.navigate('Register')}
                      >
                        <Text style={{ color: theme.likeBg, fontWeight: '700' }}>Créer son compte</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  );

                return (
                  <View style={{ flex: 1, paddingHorizontal: 16, backgroundColor: theme.bg }}>
                    <ThemeSelector pref={themePref} setPref={setThemePref} colors={theme} />
                    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
                      <Stack.Screen name="Login" component={LoginScreen} />
                      <Stack.Screen name="Register" component={RegisterScreen} />
                    </Stack.Navigator>
                  </View>
                );
              }}
              </Tab.Screen>
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
   Styles
   ──────────────────────────────────────────────────────────────────────────── */
const RADIUS_CARD = 16;
const { width: screenW } = Dimensions.get('window');
const DECK_W = Math.round(screenW * 0.92); // ~4% margin each side
const DECK_H = Math.round(DECK_W * 4 / 3); // 3:4 ratio
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'flex-start', paddingTop: 8 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  done:      { fontSize: 18, textAlign: 'center' },

  // Conteneur du deck (centré, largeur fixe, ratio 3:4)
  deck: {
    alignSelf: 'center',
    width: DECK_W,
    height: DECK_H,
    position: 'relative',
    marginTop: 4,
  },
  swiperContainer: {
    width: DECK_W,
    height: DECK_H,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperCard: {
    width: DECK_W,
    height: DECK_H,
    borderRadius: RADIUS_CARD,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  mediaFrame: {
    borderRadius: RADIUS_CARD,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // Textes
  title: { color: '#fff', fontWeight: '700', fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  meta:  { color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  price: { color: '#fff', fontWeight: '800', fontSize: 18, marginTop: 4 },

  // Boutons
  actions: { flexDirection: 'row', marginTop: 20, justifyContent: 'center' },
  glassBtn: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.10)', // fallback, override inline for dynamic
    backgroundColor: 'transparent',
    // elevation: 1, // (optionnel Android)
  },
  btn:     { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  btnXL:   { paddingVertical: 16, paddingHorizontal: 26, borderRadius: 16, minWidth: 150, alignItems: 'center', marginHorizontal: 12 },
  btnLabelXL: { fontSize: 18, fontWeight: '800' },

  // Formulaire (create)
  imagePick:   { height: 220, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
  pickPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  input:       { borderColor: '#E5E5E5', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10 },

  // Info panel sous la photo (deck)
  infoPanelWrap: {
    width: DECK_W,
    alignSelf: 'center',
    marginTop: 8
  },
  glassPanelBelow: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    // borderColor dynamique via style inline dans le composant
    backgroundColor: 'transparent',
  },
});