import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';

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
      `Вы уверены, что хотите удалить все ${count} скачанных книг? Их можно будет скачать заново в любой момент.`,
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
            <Ionicons name="server-outline" size={24} color="#8B6914" />
            <Text style={styles.cardTitle}>Память устройства</Text>
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color="#8B6914" style={{ marginTop: 10 }} />
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
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.deleteBtnText}>Удалить все книги</Text>
        </TouchableOpacity>

        <View style={styles.infoBlock}>
          <Text style={styles.infoText}>Алтын китеп v1.0.0</Text>
          <Text style={styles.infoText}>Электронная библиотека школ КР</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#8B6914' },
  
  content: { paddingHorizontal: 16 },
  
  card: { backgroundColor: '#E8DCC8', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#D4C4A8' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#2C2416' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#8B6914' },
  statLabel: { fontSize: 14, color: '#6B5D4F', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#D4C4A8' },
  
  deleteBtn: { backgroundColor: '#d32f2f', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8, marginBottom: 30 },
  deleteBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  infoBlock: { alignItems: 'center', marginTop: 20, opacity: 0.6 },
  infoText: { fontSize: 14, color: '#6B5D4F', marginBottom: 4 }
});