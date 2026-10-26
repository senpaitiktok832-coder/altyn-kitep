import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function SettingsScreen() {
  const { isDark, setIsDark, theme } = useTheme();
  const [size, setSize] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const calculateSize = async () => {
    setLoading(true);
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      let total = 0, pdfCount = 0;
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory + file);
          if (info.exists) { total += info.size; pdfCount++; }
        }
      }
      setSize(total); setCount(pdfCount);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { calculateSize(); }, []));

  const clearAll = () => {
    if (count === 0) return Alert.alert("Пусто", "У вас нет скачанных книг.");
    Alert.alert("Очистить память?", `Удалить все ${count} книг?`, [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => {
          const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
          for (const file of files) { if (file.endsWith('.pdf')) await FileSystem.deleteAsync(FileSystem.documentDirectory + file, { idempotent: true }); }
          calculateSize(); Alert.alert("Готово", "Все книги удалены.");
      }}
    ]);
  };

  const onShare = async () => {
    try { await Share.share({ message: 'Скачай приложение «Алтын китеп»! Все школьные учебники в твоем телефоне, работают без интернета. Скачать: https://github.com/senpaitiktok832-coder/altyn-kitep/releases' }); } catch (e) { console.log(e); }
  };

  const formatSize = (bytes) => bytes === 0 ? '0 МБ' : (bytes / (1024 * 1024)).toFixed(1) + ' МБ';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}><Text style={[styles.headerTitle, { color: theme.text }]}>Настройки</Text></View>
      <View style={styles.content}>
        
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}><Ionicons name="server-outline" size={22} color={theme.accent} /><Text style={[styles.cardTitle, { color: theme.text }]}>Память устройства</Text></View>
          {loading ? <ActivityIndicator size="small" color={theme.accent} /> : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}><Text style={[styles.statValue, { color: theme.accent }]}>{count}</Text><Text style={[styles.statLabel, { color: theme.subtext }]}>Скачано книг</Text></View>
              <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              <View style={styles.statItem}><Text style={[styles.statValue, { color: theme.accent }]}>{formatSize(size)}</Text><Text style={[styles.statLabel, { color: theme.subtext }]}>Занято</Text></View>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="moon-outline" size={22} color={theme.accent} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Тёмная тема</Text>
          </View>
          <Switch value={isDark} onValueChange={setIsDark} trackColor={{ false: '#767577', true: theme.accent }} />
        </View>

        <TouchableOpacity style={[styles.card, { backgroundColor: theme.card, flexDirection: 'row', alignItems: 'center', gap: 10 }]} onPress={onShare}>
          <Ionicons name="share-outline" size={22} color={theme.accent} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Поделиться приложением</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: theme.card }]} onPress={clearAll}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={styles.deleteBtnText}>Удалить все книги</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20 },
  headerTitle: { fontSize: 34, fontWeight: '700' },
  content: { paddingHorizontal: 20 },
  card: { borderRadius: 16, padding: 20, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 14, marginTop: 4 },
  statDivider: { width: 1, height: 40 },
  deleteBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16, gap: 8 },
  deleteBtnText: { color: '#FF3B30', fontSize: 17, fontWeight: '500' }
});