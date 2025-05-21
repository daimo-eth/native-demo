import { StyleSheet, TouchableOpacity, View, Dimensions, ImageBackground, Linking, Platform } from 'react-native';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const WEBVIEW_URL = 'https://miniapp.daimo.com/embed/world-wallet?toAddress=0xDa130a3573e1a5F54f1B7C2F324bf5d4F89b3c27&refundAddress=0xEEee8B1371f1664b7C2A8c111D6062b6576fA6f0&toToken=0x79A02482A880bCE3F13e09Da970dC34db4CD24d1';

const images = [
  require('@/assets/images/stable1.png'),
  require('@/assets/images/stable2.png'),
  require('@/assets/images/stable3.png'),
];

export default function HomeScreen() {
  const [imageIndex, setImageIndex] = useState(0);
  const [showWebView, setShowWebView] = useState(false);

  const handlePress = () => {
    if (imageIndex === 0) {
      setImageIndex(1);
    } else if (imageIndex === 1) {
      setImageIndex(2);
      setShowWebView(true);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TouchableOpacity
        style={styles.fullScreenButton}
        onPress={handlePress}
        activeOpacity={0.9}
        disabled={showWebView}
      >
        <ImageBackground
          source={images[imageIndex]}
          style={styles.backgroundImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
      {showWebView && (
        <View style={styles.overlay} pointerEvents="box-none">
          <WebView
            source={{ uri: WEBVIEW_URL }}
            style={styles.webview}
            originWhitelist={["*"]}
            containerStyle={{ backgroundColor: 'transparent' }}
            androidHardwareAccelerationDisabled={false}
            androidLayerType="hardware"
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            injectedJavaScript={''}
            onShouldStartLoadWithRequest={event => {
              const customSchemes = [
                'rainbow://',
                'trust://',
                'cbwallet://',
                'familywallet://',
                'zerion://',
              ];
              if (customSchemes.some(scheme => event.url.startsWith(scheme))) {
                Linking.openURL(event.url);
                return false; // Prevent WebView from loading it
              }
              return true;
            }}
          />
        </View>
      )}
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenButton: {
    flex: 1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    opacity: 1,
    zIndex: 2,
  },
});
