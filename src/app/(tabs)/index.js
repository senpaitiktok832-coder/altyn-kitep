import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { books } from '../../../data/books';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function CatalogScreen() {
  const [selectedGrade, setSelectedGrade] = useState(3);
  const [downloadedBooks, setDownloadedBooks] = useState({});
  const [isChecking, setIsChecking] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useFocusEffect(
    useCallback(() => {
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
      checkDownloads();
    }, [])
  );

  const gradeBooks = books.filter((b) => b.grade === selectedGrade && 
    (b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     b.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedBooks = gradeBooks.reduce((acc, book) => {
    let groupName = book.subject;
    if (book.grade === 1) {
      if (book.title.toLowerCase().includes('алиппе') || book.title.toLowerCase().includes('буквар')) {
        groupName = book.title.split(' ').slice(0, 2).join(' ').replace(/,/g, '');
      }
    }
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(book);
    return acc;
  }, {});

  const displayItems = Object.keys(groupedBooks).map(key => ({
    displayTitle: key,
    books: groupedBooks[key]
  }));

  const handleItemPress = (itemGroup) => {
    if (itemGroup.books.length === 1) {
      const book = itemGroup.books[0];
      if (book.url) {
        router.push(`/book/${book.id}`);
      } else {
        alert("Скоро", "Эта книга еще не добавлена");
      }
      return;
    }
    setSelectedSubject(itemGroup);
    setModalVisible(true);
  };

  const onShare = async () => {
    try {
      await Share.share({ message: 'Скачай приложение «Алтын китеп»! Все школьные учебники в твоем телефоне.' });
    } catch (error) {}
  };

  const getSubjectIcon = (subject) => {
    const s = subject.toLowerCase();
    if (s.includes('матем') || s.includes('алгебр')) return { name: 'calculator-outline' };
    if (s.includes('физик')) return { name: 'planet-outline' };
    if (s.includes('хими')) return { name: 'flask-outline' };
    if (s.includes('биолог')) return { name: 'leaf-outline' };
    if (s.includes('геогр')) return { name: 'earth-outline' };
    if (s.includes('истор') || s.includes('тарых')) return { name: 'time-outline' };
    if (s.includes('англ')) return { name: 'language-outline' };
    if (s.includes('кыргыз') || s.includes('кырг') || s.includes('алиппе')) return { name: 'chatbubbles-outline' };
    if (s.includes('рус') || s.includes('буквар') || s.includes('литерет') || s.includes('чтен')) return { name: 'document-text-outline' };
    if (s.includes('информ') || s.includes('ихт')) return { name: 'laptop-outline' };
    if (s.includes('изо') || s.includes('көркөм')) return { name: 'color-palette-outline' };
    if (s.includes('музык')) return { name: 'musical-notes-outline' };
    if (s.includes('наук') || s.includes('айлана') || s.includes('мир')) return { name: 'flask-outline' };
    if (s.includes('мекен') || s.includes('родин')) return { name: 'map-outline' };
    return { name: 'book-outline' };
  };

  const renderGrade = (grade) => (
    <TouchableOpacity
      key={grade}
      style={[styles.gradeButton, selectedGrade === grade && styles.gradeButtonActive]}
      onPress={() => setSelectedGrade(grade)}
    >
      <Text style={[styles.gradeText, selectedGrade === grade && styles.gradeTextActive]}>{grade}</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => {
    const isAnyDownloaded = item.books.some(b => downloadedBooks[b.id]);
    const isAvailable = item.books.some(b => b.url);
    const iconData = getSubjectIcon(item.displayTitle);

    return (
      <TouchableOpacity 
        style={[styles.card, !isAvailable && styles.cardDisabled]} 
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={iconData.name} size={24} color={isAvailable ? "#C29B57" : "#C7C7CC"} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, !isAvailable && styles.cardTitleDisabled]}>{item.displayTitle}</Text>
          <Text style={styles.cardSubtitle}>{item.books.length} вариантов</Text>
        </View>
        
        {!isAvailable ? (
          <Text style={styles.soonText}>Скоро</Text>
        ) : isAnyDownloaded ? (
          <Ionicons name="checkmark-circle" size={26} color="#34C759" />
        ) : (
          <Ionicons name="cloud-download-outline" size={24} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.logo}>Алтын китеп</Text>
          <Text style={styles.tagline}>Библиотека</Text>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 5 }}>
          <TouchableOpacity onPress={onShare} style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color="#C29B57" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/ai')} style={[styles.actionButton, { backgroundColor: '#C29B57' }]}>
            <Ionicons name="sparkles" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholder="Поиск" placeholderTextColor="#8E8E93" value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <View style={styles.gradesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradesContainer}>
          {GRADES.map(renderGrade)}
        </ScrollView>
      </View>

      {isChecking ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#C29B57" /></View>
      ) : (
        <FlatList
          data={displayItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.displayTitle}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Ничего не найдено</Text>}
        />
      )}

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSubject?.displayTitle}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={28} color="#C7C7CC" /></TouchableOpacity>
            </View>
            <FlatList
              data={selectedSubject?.books || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isAvailable = !!item.url;
                const isDownloaded = downloadedBooks[item.id];
                return (
                  <TouchableOpacity 
                    style={[styles.modalItem, !isAvailable && styles.modalItemDisabled]}
                    onPress={() => { if (isAvailable) { setModalVisible(false); router.push(`/book/${item.id}`); } }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemTitle}>{item.title}</Text>
                      <Text style={styles.modalItemSub}>{item.year ? `${item.year} • ` : ''}{item.lang === 'kyr' ? 'Кыргызча' : 'Русский'}</Text>
                    </View>
                    {!isAvailable ? <Text style={styles.soonText}>Скоро</Text> : isDownloaded ? <Ionicons name="checkmark-circle" size={22} color="#34C759" /> : <Ionicons name="cloud-download-outline" size={22} color="#007AFF" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginBottom: 15 },
  logo: { fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5 },
  tagline: { fontSize: 17, color: '#8E8E93', fontWeight: '500', marginTop: -2 },
  actionButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3E3E8', borderRadius: 10, marginHorizontal: 20, paddingHorizontal: 12, marginBottom: 20, height: 40 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 17, color: '#000' },
  gradesWrapper: { height: 50, marginBottom: 15 },
  gradesContainer: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  gradeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  gradeButtonActive: { backgroundColor: '#C29B57' },
  gradeText: { fontSize: 17, fontWeight: '600', color: '#000' },
  gradeTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardDisabled: { opacity: 0.6 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  cardTitleDisabled: { color: '#C7C7CC' },
  cardSubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
  soonText: { fontSize: 13, color: '#C7C7CC', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#8E8E93', fontSize: 17 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F2F2F7', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#000' },
  modalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 10 },
  modalItemDisabled: { opacity: 0.5 },
  modalItemTitle: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 2 },
  modalItemSub: { fontSize: 15, color: '#8E8E93' },
});