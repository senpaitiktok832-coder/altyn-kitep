import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { books } from '../../../data/books';
import { useTheme } from '../../context/ThemeContext'; // Исправленный путь

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function CatalogScreen() {
  const { theme } = useTheme();
  const [selectedGrade, setSelectedGrade] = useState(5);
  const [downloadedBooks, setDownloadedBooks] = useState({});
  const [isChecking, setIsChecking] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const checkDownloads = async () => {
    setIsChecking(true);
    const status = {};
    for (const book of books) {
      if (book.url) {
        const fileUri = FileSystem.documentDirectory + `${book.id}.pdf`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) status[book.id] = true;
      }
    }
    setDownloadedBooks(status);
    setIsChecking(false);
  };

  useFocusEffect(useCallback(() => { checkDownloads(); }, []));

  const onShare = async () => {
    try { await Share.share({ message: 'Скачай приложение «Алтын китеп»! Все школьные учебники в твоем телефоне, работают без интернета. Скачать: https://github.com/senpaitiktok832-coder/altyn-kitep/releases' }); } catch (e) { console.log(e); }
  };

  const gradeBooks = books.filter((b) => b.grade === selectedGrade && 
    (b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedBooks = gradeBooks.reduce((acc, book) => {
    if (!acc[book.subject]) acc[book.subject] = [];
    acc[book.subject].push(book);
    return acc;
  }, {});

  const displaySubjects = Object.keys(groupedBooks).map(subject => ({ subject, books: groupedBooks[subject] }));

  const handleSubjectPress = (subjectGroup) => {
    const availableBooks = subjectGroup.books.filter(b => b.url);
    if (availableBooks.length === 0) return alert("Скоро", "Книга не добавлена");
    if (availableBooks.length === 1) return router.push(`/book/${availableBooks[0].id}`);
    setSelectedSubject(subjectGroup);
    setModalVisible(true);
  };

  const handleDownloadAll = async () => {
    if (isDownloadingAll) return;
    const allBooks = books.filter(b => b.grade === selectedGrade && b.url);
    const notDownloaded = allBooks.filter(b => !downloadedBooks[b.id]);
    if (notDownloaded.length === 0) return Alert.alert("Готово", "Все книги уже скачаны!");
    setIsDownloadingAll(true);
    for (let i = 0; i < notDownloaded.length; i++) {
      setDownloadProgress(`Скачивание ${i + 1} из ${notDownloaded.length}...`);
      await FileSystem.downloadAsync(notDownloaded[i].url, FileSystem.documentDirectory + `${notDownloaded[i].id}.pdf`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(e => console.log(e));
    }
    await checkDownloads();
    setIsDownloadingAll(false);
    setDownloadProgress('');
    Alert.alert("Успех!", `Скачано ${notDownloaded.length} книг.`);
  };

  const getSubjectIcon = (subject) => {
    const s = subject.toLowerCase();
    if (s.includes('матем') || s.includes('алгебр')) return { name: 'calculator-outline' };
    if (s.includes('физик')) return { name: 'planet-outline' };
    if (s.includes('хими')) return { name: 'flask-outline' };
    if (s.includes('биолог')) return { name: 'leaf-outline' };
    if (s.includes('геогр')) return { name: 'earth-outline' };
    if (s.includes('истор')) return { name: 'time-outline' };
    if (s.includes('англ')) return { name: 'language-outline' };
    if (s.includes('кыргыз') || s.includes('кырг')) return { name: 'chatbubbles-outline' };
    if (s.includes('рус')) return { name: 'document-text-outline' };
    if (s.includes('информ') || s.includes('ихт')) return { name: 'laptop-outline' };
    if (s.includes('чтен') || s.includes('литерет') || s.includes('адабий')) return { name: 'book-outline' };
    if (s.includes('мекен')) return { name: 'map-outline' };
    return { name: 'albums-outline' };
  };

  const renderGrade = (grade) => {
    const isActive = selectedGrade === grade;
    return (
      <TouchableOpacity key={grade} style={[styles.gradeButton, { backgroundColor: isActive ? theme.accent : theme.card }, isActive && styles.gradeButtonActive]} onPress={() => setSelectedGrade(grade)}>
        <Text style={[styles.gradeText, { color: isActive ? '#FFF' : theme.text }]}>{grade}</Text>
      </TouchableOpacity>
    );
  };

  const renderSubject = ({ item }) => {
    const isAnyDownloaded = item.books.some(b => downloadedBooks[b.id]);
    const isAvailable = item.books.some(b => b.url);
    const iconData = getSubjectIcon(item.subject);

    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: theme.card }, !isAvailable && styles.cardDisabled]} onPress={() => handleSubjectPress(item)} activeOpacity={0.7}>
        <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
          <Ionicons name={iconData.name} size={24} color={isAvailable ? theme.accent : theme.subtext} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.text }, !isAvailable && { color: theme.subtext }]}>{item.subject}</Text>
          <Text style={[styles.cardSubtitle, { color: theme.subtext }]}>{item.books.length} вариантов</Text>
        </View>
        {!isAvailable ? <Text style={{ color: theme.subtext, fontSize: 13, fontWeight: '600' }}>Скоро</Text> : isAnyDownloaded ? <Ionicons name="checkmark-circle" size={26} color="#34C759" /> : <Ionicons name="cloud-download-outline" size={24} color="#007AFF" />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.logo, { color: theme.text }]}>Алтын китеп</Text>
          <Text style={[styles.tagline, { color: theme.subtext }]}>Библиотека</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={onShare} style={[styles.iconBtn, { backgroundColor: theme.iconBg }]}>
            <Ionicons name="share-outline" size={20} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/ai')} style={[styles.iconBtn, { backgroundColor: theme.accent }]}>
            <Ionicons name="sparkles" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.searchBg }]}>
        <Ionicons name="search" size={20} color={theme.subtext} style={styles.searchIcon} />
        <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Поиск" placeholderTextColor={theme.subtext} value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <View style={styles.gradesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradesContainer}>{GRADES.map(renderGrade)}</ScrollView>
      </View>

      {!isChecking && (
        <TouchableOpacity style={[styles.downloadAllBtn, isDownloadingAll && { opacity: 0.7 }]} onPress={handleDownloadAll} disabled={isDownloadingAll}>
          {isDownloadingAll ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="cloud-download" size={20} color="#FFF" />}
          <Text style={styles.downloadAllText}>{isDownloadingAll ? downloadProgress : `Скачать все книги ${selectedGrade} класса`}</Text>
        </TouchableOpacity>
      )}

      {isChecking ? <ActivityIndicator size="large" color={theme.accent} style={{ flex: 1 }} /> : (
        <FlatList data={displaySubjects} renderItem={renderSubject} keyExtractor={i => i.subject} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.subtext }]}>Ничего не найдено</Text>} />
      )}

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.bg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedSubject?.subject}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={28} color={theme.subtext} /></TouchableOpacity>
            </View>
            <FlatList data={selectedSubject?.books || []} keyExtractor={i => i.id} renderItem={({ item }) => {
              const isAvail = !!item.url; const isDown = downloadedBooks[item.id];
              return (
                <TouchableOpacity style={[styles.modalItem, { backgroundColor: theme.card }, !isAvail && styles.modalItemDisabled]} onPress={() => { if (isAvail) { setModalVisible(false); router.push(`/book/${item.id}`); } }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemTitle, { color: theme.text }]}>{item.year ? `${item.year} год` : ''} • {item.lang === 'kyr' ? 'Кыргызча' : 'Русский'}</Text>
                    <Text style={[styles.modalItemSub, { color: theme.subtext }]}>Учебник</Text>
                  </View>
                  {!isAvail ? <Text style={{ color: theme.subtext }}>Скоро</Text> : isDown ? <Ionicons name="checkmark-circle" size={22} color="#34C759" /> : <Ionicons name="cloud-download-outline" size={22} color="#007AFF" />}
                </TouchableOpacity>
              );
            }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginBottom: 15 },
  logo: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  tagline: { fontSize: 17, fontWeight: '500', marginTop: -2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, marginHorizontal: 20, paddingHorizontal: 12, marginBottom: 15, height: 40 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 17 },
  gradesWrapper: { height: 50, marginBottom: 10 },
  gradesContainer: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  gradeButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  gradeButtonActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  gradeText: { fontSize: 17, fontWeight: '600' },
  downloadAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#007AFF', marginHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8, marginBottom: 15 },
  downloadAllText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardDisabled: { opacity: 0.6 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardSubtitle: { fontSize: 14, marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 17 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 24, fontWeight: '700' },
  modalItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10 },
  modalItemDisabled: { opacity: 0.5 },
  modalItemTitle: { fontSize: 17, fontWeight: '600', marginBottom: 2 },
  modalItemSub: { fontSize: 15 },
});