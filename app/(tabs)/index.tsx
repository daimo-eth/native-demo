import { StyleSheet, TouchableOpacity, View, Dimensions, ImageBackground, Linking, Platform } from 'react-native';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const WEBVIEW_URL = 'https://miniapp.daimo.com/embed?toChain=10&toToken=0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85&toAddress=0x4E04D236A5aEd4EB7d95E0514c4c8394c690BB58&refundAddress=0x4E04D236A5aEd4EB7d95E0514c4c8394c690BB58&intent=Purchase%20Card&toUnits=10';

const images = [
  require('@/assets/images/farcaster1.png'),
];

export default function HomeScreen() {
  const [imageIndex, setImageIndex] = useState(0);
  const [showWebView, setShowWebView] = useState(false);

  const handlePress = () => {
    setShowWebView(true);
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
            onMessage={event => {
              try {
                const message = JSON.parse(event.nativeEvent.data);
                if (message.source === 'daimo-pay') {
                  if (message.type === 'modalClosed') {
                    setShowWebView(false);
                  } else if (message.type === 'modalOpened') {
                    // Payment modal opened - could add analytics/logging here
                    console.log('Daimo Pay modal opened');
                  }
                }
              } catch (error) {
                // Handle non-JSON messages or parsing errors
                console.log('Received non-JSON message:', event.nativeEvent.data);
              }
            }}
            onShouldStartLoadWithRequest={event => {
              // Only allow main Daimo Pay domain in WebView
              if (event.url.includes('https://miniapp.daimo.com')) {
                return true;
              }
              Linking.openURL(event.url);
              return false;
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
