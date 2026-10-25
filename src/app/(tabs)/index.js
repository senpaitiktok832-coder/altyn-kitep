import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { books } from '../../../data/books';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function CatalogScreen() {
  const [selectedGrade, setSelectedGrade] = useState(5);
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
            if (fileInfo.exists) {
              status[book.id] = true;
            }
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
    if (!acc[book.subject]) acc[book.subject] = [];
    acc[book.subject].push(book);
    return acc;
  }, {});

  const displaySubjects = Object.keys(groupedBooks).map(subject => ({
    subject,
    books: groupedBooks[subject]
  }));

  const handleSubjectPress = (subjectGroup) => {
    const availableBooks = subjectGroup.books.filter(b => b.url);
    if (availableBooks.length === 0) {
      alert("Скоро", "Эта книга еще не добавлена в приложение");
      return;
    }
    if (availableBooks.length === 1) {
      router.push(`/book/${availableBooks[0].id}`);
      return;
    }
    setSelectedSubject(subjectGroup);
    setModalVisible(true);
  };

  const getSubjectIcon = (subject) => {
    const s = subject.toLowerCase();
    if (s.includes('матем') || s.includes('алгебр')) return { name: 'calculator' };
    if (s.includes('физик')) return { name: 'planet-outline' };
    if (s.includes('хими')) return { name: 'flask-outline' };
    if (s.includes('биолог')) return { name: 'leaf-outline' };
    if (s.includes('геогр')) return { name: 'earth-outline' };
    if (s.includes('истор')) return { name: 'time-outline' };
    if (s.includes('англ') || s.includes('язык') || s.includes('тили')) return { name: 'language-outline' };
    if (s.includes('информ')) return { name: 'laptop-outline' };
    return { name: 'book-outline' };
  };

  const renderGrade = (grade) => {
    const isActive = selectedGrade === grade;
    return (
      <TouchableOpacity
        key={grade}
        style={[styles.gradeButton, isActive && styles.gradeButtonActive]}
        onPress={() => setSelectedGrade(grade)}
      >
        <Text style={[styles.gradeText, isActive && styles.gradeTextActive]}>
          {grade}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSubject = ({ item }) => {
    const isAnyDownloaded = item.books.some(b => downloadedBooks[b.id]);
    const isAvailable = item.books.some(b => b.url);
    const iconData = getSubjectIcon(item.subject);

    return (
      <TouchableOpacity 
        style={[styles.card, !isAvailable && styles.cardDisabled]} 
        onPress={() => handleSubjectPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: isAvailable ? '#F2F2F7' : '#F2F2F7' }]}>
          <Ionicons name={iconData.name} size={24} color={isAvailable ? "#C29B57" : "#C7C7CC"} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, !isAvailable && styles.cardTitleDisabled]}>
            {item.subject}
          </Text>
          <Text style={styles.cardSubtitle}>
            {item.books.length} {item.books.length === 1 ? 'вариант' : 'вариантов'}
          </Text>
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
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.logo}>Алтын китеп</Text>
          <Text style={styles.tagline}>Библиотека</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/ai')} style={styles.aiButton}>
          <Ionicons name="sparkles" size={18} color="#FFF" />
          <Text style={styles.aiButtonText}>ИИ</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск"
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.gradesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gradesContainer}>
          {GRADES.map(renderGrade)}
        </ScrollView>
      </View>

      {isChecking ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C29B57" />
        </View>
      ) : (
        <FlatList
          data={displaySubjects}
          renderItem={renderSubject}
          keyExtractor={(item) => item.subject}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Ничего не найдено</Text>}
        />
      )}

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSubject?.subject}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#C7C7CC" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Выберите учебник:</Text>
            <FlatList
              data={selectedSubject?.books || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isAvailable = !!item.url;
                const isDownloaded = downloadedBooks[item.id];
                const langText = item.lang === 'kyr' ? 'Кыргызча' : 'Русский';
                const typeText = item.type === 'teacher' ? 'Для учителя' : 'Учебник';

                return (
                  <TouchableOpacity 
                    style={[styles.modalItem, !isAvailable && styles.modalItemDisabled]}
                    onPress={() => {
                      if (isAvailable) {
                        setModalVisible(false);
                        router.push(`/book/${item.id}`);
                      }
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemTitle}>
                        {item.year ? `${item.year} год` : ''} • {langText}
                      </Text>
                      <Text style={styles.modalItemSub}>{typeText}</Text>
                    </View>
                    {!isAvailable ? (
                      <Text style={styles.soonText}>Скоро</Text>
                    ) : isDownloaded ? (
                      <Ionicons name="checkmark-circle" size={22} color="#34C759" />
                    ) : (
                      <Ionicons name="cloud-download-outline" size={22} color="#007AFF" />
                    )}
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
  container: { flex: 1, backgroundColor: '#F2F2F7', paddingTop: 60 }, // iOS Light Gray
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginBottom: 15 },
  logo: { fontSize: 34, fontWeight: '700', color: '#000', letterSpacing: -0.5 },
  tagline: { fontSize: 17, color: '#8E8E93', fontWeight: '500', marginTop: -2 },
  
  aiButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#C29B57', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, marginBottom: 5 },
  aiButtonText: { color: '#FFF', fontWeight: '600', fontSize: 15 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3E3E8', borderRadius: 10, marginHorizontal: 20, paddingHorizontal: 12, marginBottom: 20, height: 40 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 17, color: '#000' },

  gradesWrapper: { height: 50, marginBottom: 15 },
  gradesContainer: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  gradeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  gradeButtonActive: { backgroundColor: '#C29B57' },
  gradeText: { fontSize: 17, fontWeight: '600', color: '#000' },
  gradeTextActive: { color: '#FFF' },
  
  list: { paddingHorizontal: 20, paddingBottom: 30 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardDisabled: { opacity: 0.6 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  cardTitleDisabled: { color: '#C7C7CC' },
  cardSubtitle: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
  
  soonText: { fontSize: 13, color: '#C7C7CC', fontWeight: '600' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#8E8E93', fontSize: 17 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F2F2F7', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#000' },
  modalSubtitle: { fontSize: 16, color: '#8E8E93', marginBottom: 20 },
  modalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 10 },
  modalItemDisabled: { opacity: 0.5 },
  modalItemTitle: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 2 },
  modalItemSub: { fontSize: 15, color: '#8E8E93' },
});