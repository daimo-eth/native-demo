import { StyleSheet, TouchableOpacity, View, Dimensions, ImageBackground, Linking, Platform } from 'react-native';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const WEBVIEW_URL = 'http://localhost:3000/embed?toAddress=0x4E04D236A5aEd4EB7d95E0514c4c8394c690BB58';

const images = [
  require('@/assets/images/farcaster1.png'),
  require('@/assets/images/farcaster2.png'),
  require('@/assets/images/farcaster3.png'),
  require('@/assets/images/farcaster4.png'),
];

export default function HomeScreen() {
  const [imageIndex, setImageIndex] = useState(0);
  const [showWebView, setShowWebView] = useState(false);

  const handlePress = () => {
    if (imageIndex === 0) {
      setImageIndex(1);
    } else if (imageIndex === 1) {
      setImageIndex(2);
    } else if (imageIndex === 2) {
      setImageIndex(3);
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
        <View style={styles.overlay}>
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
