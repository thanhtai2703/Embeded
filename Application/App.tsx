import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import HomeMenu from './src/components/HomeMenu';

export default function App() {
  return (
    <View style={styles.container}>
      <HomeMenu />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
