import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

const DAIMO_API_KEY = process.env.EXPO_PUBLIC_DAIMO_API_KEY;
const DAIMO_SESSIONS_URL = 'https://api.daimo.com/v1/sessions';
const DAIMO_WEBVIEW_URL = 'https://daimo.com/webview';
const WEBVIEW_ORIGINS = [
  'https://daimo.com',
  'https://*.daimo.com',
  'https://auth.privy.io',
  'https://pay.coinbase.com',
  'https://risk.checkout.com',
];
const WEBVIEW_HOSTS = ['daimo.com', 'auth.privy.io', 'pay.coinbase.com', 'risk.checkout.com'];

const BASE_USDC_DESTINATION = {
  type: 'evm',
  address: '0x4E04D236A5aEd4EB7d95E0514c4c8394c690BB58',
  chainId: 8453,
  tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

const MODES = [
  { id: 'embed', label: 'Embed' },
  { id: 'modal', label: 'Modal' },
  { id: 'center', label: 'Centered' },
] as const;

const PAYMENT_PRESETS = [
  {
    id: 'default',
    label: 'Default',
    detail: 'Wallets, exchanges, addresses',
    paymentOptions: undefined,
  },
  {
    id: 'all-fiat',
    label: 'All fiat',
    detail: 'Every enabled fiat rail',
    paymentOptions: ['AllFiat'],
  },
  {
    id: 'canada',
    label: 'Canada',
    detail: 'Interac CAD',
    paymentOptions: ['Interac'],
  },
  {
    id: 'apple-pay',
    label: 'Apple Pay',
    detail: 'US Apple Pay',
    paymentOptions: ['ApplePay'],
  },
  {
    id: 'us-ach',
    label: 'US ACH',
    detail: 'ACH USD',
    paymentOptions: ['ACH'],
  },
  {
    id: 'europe',
    label: 'Europe',
    detail: 'SEPA EUR',
    paymentOptions: ['SEPA'],
  },
  {
    id: 'argentina',
    label: 'Argentina',
    detail: 'Lemon',
    paymentOptions: ['Lemon'],
  },
  {
    id: 'cash-app',
    label: 'Cash App',
    detail: 'Lightning',
    paymentOptions: ['CashApp'],
  },
  {
    id: 'tron',
    label: 'Tron',
    detail: 'USDT address',
    paymentOptions: ['Tron'],
  },
  {
    id: 'base',
    label: 'Base',
    detail: 'Base address',
    paymentOptions: ['Base'],
  },
  {
    id: 'wallets',
    label: 'Wallets',
    detail: 'All wallet deeplinks',
    paymentOptions: ['AllWallets'],
  },
  {
    id: 'exchanges',
    label: 'Exchanges',
    detail: 'Coinbase, Binance, Lemon',
    paymentOptions: ['AllExchanges'],
  },
  {
    id: 'everything',
    label: 'Everything',
    detail: 'Fiat, wallets, exchanges, addresses',
    paymentOptions: ['AllFiat', 'AllWallets', 'AllExchanges', 'AllAddresses', 'CashApp', 'Tron'],
  },
] as const;

type WebViewMode = typeof MODES[number]['id'];
type PaymentPreset = typeof PAYMENT_PRESETS[number];

type ActiveRun = {
  mode: WebViewMode;
  preset: PaymentPreset;
  sessionId: string;
  url: string;
};

type DaimoSessionResponse = {
  session?: {
    sessionId?: string;
    clientSecret?: string;
  };
  error?: string | { message?: string };
  message?: string;
};

type DaimoWebViewMessage = {
  source?: string;
  type?: string;
  payload?: {
    height?: number;
  };
};

function buildDaimoWebViewUrl(sessionId: string, clientSecret: string, mode: WebViewMode) {
  const params = [
    `session=${encodeURIComponent(sessionId)}`,
    `cs=${encodeURIComponent(clientSecret)}`,
  ];

  if (mode === 'embed') {
    params.push('layout=embed');
  } else if (mode === 'center') {
    params.push('layout=center');
  }

  return `${DAIMO_WEBVIEW_URL}?${params.join('&')}`;
}

function getDaimoErrorMessage(response: DaimoSessionResponse | null, status: number) {
  if (typeof response?.error === 'string') {
    return response.error;
  }
  return response?.error?.message ?? response?.message ?? `HTTP ${status}`;
}

function isAllowedDaimoUrl(url: string) {
  if (url === 'about:blank') {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(url);
    return protocol === 'https:' && (
      WEBVIEW_HOSTS.includes(hostname) || hostname.endsWith('.daimo.com')
    );
  } catch {
    return false;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function createDaimoRun(apiKey: string, preset: PaymentPreset, mode: WebViewMode): Promise<ActiveRun> {
  const display: { title: string; verb: string; paymentOptions?: readonly string[] } = {
    title: `Daimo ${preset.label} Test`,
    verb: 'Deposit',
    paymentOptions: preset.paymentOptions,
  };

  const response = await fetch(DAIMO_SESSIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destination: BASE_USDC_DESTINATION,
      display,
    }),
  });

  const json = await response.json().catch(() => null) as DaimoSessionResponse | null;

  if (!response.ok) {
    throw new Error(`Daimo session failed: ${getDaimoErrorMessage(json, response.status)}`);
  }

  const sessionId = json?.session?.sessionId;
  const clientSecret = json?.session?.clientSecret;

  if (!sessionId || !clientSecret) {
    throw new Error('Daimo session response was missing sessionId or clientSecret.');
  }

  return {
    mode,
    preset,
    sessionId,
    url: buildDaimoWebViewUrl(sessionId, clientSecret, mode),
  };
}

export default function HomeScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const [selectedMode, setSelectedMode] = useState<WebViewMode>('embed');
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [embedContentHeight, setEmbedContentHeight] = useState(480);
  const [blockedUrls, setBlockedUrls] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const drawerTranslateY = useRef(new Animated.Value(0)).current;

  const maxDrawerHeight = Math.round(windowHeight * 0.82);
  const embedWebViewHeight = clamp(embedContentHeight, 320, Math.max(360, maxDrawerHeight - 76));
  const drawerHeight = Math.min(embedWebViewHeight + 76, maxDrawerHeight);

  const closeWebView = () => {
    setActiveRun(null);
    setEmbedContentHeight(480);
    drawerTranslateY.setValue(0);
  };

  const appendEvent = (label: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEvents(current => [`${time} ${label}`, ...current].slice(0, 8));
  };

  const openPreset = async (preset: PaymentPreset) => {
    if (isLoading) {
      return;
    }

    if (!DAIMO_API_KEY) {
      const message = 'Set EXPO_PUBLIC_DAIMO_API_KEY to create a Daimo test session.';
      setErrorMessage(message);
      Alert.alert('Missing Daimo API key', message);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setBlockedUrls([]);
    setEvents([]);
    drawerTranslateY.setValue(0);

    try {
      const run = await createDaimoRun(DAIMO_API_KEY, preset, selectedMode);
      setActiveRun(run);
      appendEvent(`opened ${run.mode} / ${run.preset.label}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create Daimo session.';
      setErrorMessage(message);
      Alert.alert('Daimo WebView', message);
    } finally {
      setIsLoading(false);
    }
  };

  const recordBlockedUrl = (url: string) => {
    console.warn('Blocked non-Daimo WebView navigation:', url);
    setBlockedUrls(urls => [url, ...urls.filter(blockedUrl => blockedUrl !== url)].slice(0, 5));
  };

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as DaimoWebViewMessage;

      if (message.source !== 'daimo-pay') {
        appendEvent('non-Daimo message');
        return;
      }

      if (message.type) {
        appendEvent(message.type);
      }

      if (message.type === 'contentHeightChanged' && typeof message.payload?.height === 'number') {
        setEmbedContentHeight(Math.ceil(message.payload.height));
      } else if (message.type === 'modalClosed') {
        closeWebView();
      }
    } catch {
      appendEvent('invalid message');
      console.log('Received non-JSON message:', event.nativeEvent.data);
    }
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx)
    ),
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) {
        drawerTranslateY.setValue(gesture.dy);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 96 || gesture.vy > 0.8) {
        Animated.timing(drawerTranslateY, {
          toValue: drawerHeight,
          duration: 180,
          useNativeDriver: true,
        }).start(closeWebView);
      } else {
        Animated.spring(drawerTranslateY, {
          toValue: 0,
          damping: 22,
          stiffness: 260,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const renderDaimoWebView = (style: StyleProp<ViewStyle>) => (
    <WebView
      source={{ uri: activeRun?.url ?? DAIMO_WEBVIEW_URL }}
      style={style}
      originWhitelist={WEBVIEW_ORIGINS}
      containerStyle={styles.webviewContainer}
      androidHardwareAccelerationDisabled={false}
      androidLayerType="hardware"
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      onMessage={handleWebViewMessage}
      onShouldStartLoadWithRequest={event => {
        if (isAllowedDaimoUrl(event.url)) {
          return true;
        }
        recordBlockedUrl(event.url);
        return false;
      }}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Native WebView Harness</Text>
          <Text style={styles.title}>Daimo payment method tester</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Destination</Text>
            <Text style={styles.summaryValue}>Base USDC</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>User entered</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>URL policy</Text>
            <Text style={styles.summaryValue}>*.daimo.com</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode</Text>
          <View style={styles.segmentedControl}>
            {MODES.map(mode => {
              const selected = mode.id === selectedMode;
              return (
                <Pressable
                  key={mode.id}
                  onPress={() => setSelectedMode(mode.id)}
                  style={[styles.segment, selected && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                    {mode.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment option</Text>
          <View style={styles.optionGrid}>
            {PAYMENT_PRESETS.map(preset => (
              <Pressable
                key={preset.id}
                onPress={() => openPreset(preset)}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.optionButtonPressed,
                  isLoading && styles.optionButtonDisabled,
                ]}
              >
                <Text style={styles.optionLabel}>{preset.label}</Text>
                <Text style={styles.optionDetail}>{preset.detail}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {(errorMessage || blockedUrls.length > 0 || events.length > 0) && (
          <View style={styles.debugBox}>
            {errorMessage && <Text style={styles.debugText}>{errorMessage}</Text>}
            {blockedUrls.map(url => (
              <Text key={url} style={styles.blockedText} numberOfLines={2}>
                Blocked: {url}
              </Text>
            ))}
            {events.map(event => (
              <Text key={event} style={styles.debugText}>
                {event}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#111827" size="large" />
        </View>
      )}

      {activeRun?.mode === 'embed' && (
        <View style={styles.scrim}>
          <Animated.View
            style={[
              styles.drawer,
              { height: drawerHeight, transform: [{ translateY: drawerTranslateY }] },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.dragHandle} />
              <View style={styles.drawerTitleBlock}>
                <Text style={styles.overlayTitle}>{activeRun.preset.label}</Text>
                <Text style={styles.overlaySubtitle}>Embed height {Math.round(embedWebViewHeight)} px</Text>
              </View>
            </View>
            {renderDaimoWebView([styles.webview, { height: embedWebViewHeight }])}
          </Animated.View>
        </View>
      )}

      {activeRun?.mode === 'center' && (
        <View style={styles.fullOverlay}>
          {renderDaimoWebView(styles.fullWebview)}
          <Pressable onPress={closeWebView} style={styles.floatingClose} hitSlop={10}>
            <Text style={styles.floatingCloseText}>x</Text>
          </Pressable>
        </View>
      )}

      {activeRun?.mode === 'modal' && (
        <View style={styles.transparentOverlay} pointerEvents="box-none">
          {renderDaimoWebView(styles.transparentWebview)}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fb',
  },
  content: {
    gap: 20,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    gap: 6,
    paddingTop: 10,
  },
  eyebrow: {
    color: '#17634f',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 36,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    minWidth: '30%',
    flexGrow: 1,
    gap: 4,
    borderWidth: 1,
    borderColor: '#dde3ec',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8dee8',
    backgroundColor: '#eef2f6',
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentSelected: {
    backgroundColor: '#111827',
  },
  segmentText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: '#fff',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    width: '48%',
    minHeight: 74,
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d8dee8',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
  },
  optionButtonPressed: {
    borderColor: '#17634f',
    backgroundColor: '#edf8f4',
  },
  optionButtonDisabled: {
    opacity: 0.55,
  },
  optionLabel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  optionDetail: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  debugBox: {
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#111827',
    padding: 12,
  },
  debugText: {
    color: '#e5e7eb',
    fontSize: 12,
    lineHeight: 16,
  },
  blockedText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247, 248, 251, 0.76)',
    zIndex: 40,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    zIndex: 30,
  },
  drawer: {
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#fff',
  },
  drawerHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  dragHandle: {
    position: 'absolute',
    top: 8,
    left: '50%',
    width: 38,
    height: 4,
    marginLeft: -19,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  drawerTitleBlock: {
    flex: 1,
    paddingTop: 10,
  },
  overlayTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  overlaySubtitle: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  webviewContainer: {
    backgroundColor: 'transparent',
  },
  webview: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 30,
  },
  fullWebview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  floatingClose: {
    position: 'absolute',
    top: 58,
    right: 16,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    zIndex: 4,
  },
  floatingCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  transparentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 30,
  },
  transparentWebview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
