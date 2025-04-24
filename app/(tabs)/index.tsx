import { StyleSheet, TouchableOpacity, Image, View, Dimensions, Text, ImageBackground } from 'react-native';

import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';

const PROTOTYPE_URL = 'https://daimo-internal-mini-app.vercel.app/bridge?toAddress=0xaaaad870619639bece2979938ea0643ed6b360f5&refundAddress=0x4E04D236A5aEd4EB7d95E0514c4c8394c690BB58&toToken=0x79A02482A880bCE3F13e09Da970dC34db4CD24d1&sourceApp=world-wallet';

export default function HomeScreen() {
  const openBrowser = async () => {
    try {
      const presentationStyle = WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET;
      // Open browser as a modal that doesn't take the full screen
      await WebBrowser.openBrowserAsync(PROTOTYPE_URL, {
        presentationStyle: presentationStyle,
        controlsColor: '#007AFF',
        toolbarColor: '#F9F9F9',
      });
    } catch (error) {
      console.error('Error opening browser:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TouchableOpacity 
        style={styles.fullScreenButton}
        onPress={openBrowser}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={require('@/assets/images/app-screenshot.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  overlay: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
  }
});
