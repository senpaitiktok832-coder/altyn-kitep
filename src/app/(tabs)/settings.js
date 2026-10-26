import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system'; // Убрали /legacy
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const [size, setSize] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const calculateSize = async () => {
    setLoading(true);
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      let total = 0;
      let pdfCount = 0;
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory + file);
          if (info.exists) {
            total += info.size;
            pdfCount++;
          }
        }
      }
      setSize(total);
      setCount(pdfCount);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      calculateSize();
    }, [])
  );

  const clearAll = () => {
    if (count === 0) {
      Alert.alert("Пусто", "У вас нет скачанных книг.");
      return;
    }

    Alert.alert(
      "Очистить память?",
      `Вы уверены, что хотите удалить все ${count} скачанных книг?`,
      [
        { text: "Отмена", style: "cancel" },
        { 
          text: "Удалить всё", 
          style: "destructive",
          onPress: async () => {
            try {
              const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
              for (const file of files) {
                if (file.endsWith('.pdf')) {
                  await FileSystem.deleteAsync(FileSystem.documentDirectory + file, { idempotent: true });
                }
              }
              calculateSize();
              Alert.alert("Готово", "Все книги удалены.");
            } catch (e) {
              Alert.alert("Ошибка", "Не удалось удалить файлы.");
            }
          }
        }
      ]
    );
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 МБ';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' МБ';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Настройки</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="server-outline" size={22} color="#C29B57" />
            <Text style={styles.cardTitle}>Память устройства</Text>
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color="#C29B57" style={{ marginTop: 10 }} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{count}</Text>
                <Text style={styles.statLabel}>Скачано книг</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatSize(size)}</Text>
                <Text style={styles.statLabel}>Занято</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.deleteBtn} onPress={clearAll}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={styles.deleteBtnText}>Удалить все книги</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 60 },
  header: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20 },
  headerTitle: { fontSize: 34, fontWeight: '700', color: '#000' },
  content: { paddingHorizontal: 20 },
  card: { backgroundColor: '#F2F2F7', borderRadius: 16, padding: 20, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#C29B57' },
  statLabel: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#C7C7CC' },
  deleteBtn: { backgroundColor: '#F2F2F7', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16, gap: 8 },
  deleteBtnText: { color: '#FF3B30', fontSize: 17, fontWeight: '500' }
});