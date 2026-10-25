import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { books } from '../../../data/books';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function CatalogScreen() {
  const [selectedGrade, setSelectedGrade] = useState(5);
  const [downloadedBooks, setDownloadedBooks] = useState({});
  const [isChecking, setIsChecking] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Стейт для всплывающего окна выбора книги
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

  // Фильтруем строго по классу и поиску
  const gradeBooks = books.filter((b) => b.grade === selectedGrade && 
    (b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
     b.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Группируем по названию предмета
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
    
    // Если вообще нет скачанных файлов на GitHub
    if (availableBooks.length === 0) {
      alert("Скоро", "Эта книга еще не добавлена в приложение");
      return;
    }

    // Если доступен только один вариант — открываем сразу, без окна
    if (availableBooks.length === 1) {
      router.push(`/book/${availableBooks[0].id}`);
      return;
    }

    // Если вариантов несколько (языки, годы, учительские) — показываем красивое окно
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

  const renderGrade = (grade) => (
    <TouchableOpacity
      key={grade}
      style={[styles.gradeButton, selectedGrade === grade && styles.gradeButtonActive]}
      onPress={() => setSelectedGrade(grade)}
    >
      <Text style={[styles.gradeText, selectedGrade === grade && styles.gradeTextActive]}>
        {grade}
      </Text>
    </TouchableOpacity>
  );

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
        <View style={styles.iconContainer}>
          <Ionicons name={iconData.name} size={24} color={isAvailable ? "#8B6914" : "#8A7E6E"} />
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
          <Text style={styles.soonBadge}>Скоро</Text>
        ) : isAnyDownloaded ? (
          <Ionicons name="checkmark-circle" size={26} color="#4CAF50" />
        ) : (
          <Ionicons name="cloud-download-outline" size={26} color="#8B6914" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.logo}>Каталог книг</Text>
        <Text style={styles.tagline}>Выберите класс и предмет</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8A7E6E" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по предмету..."
          placeholderTextColor="#8A7E6E"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#8A7E6E" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.gradesWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gradesContainer}
        >
          {GRADES.map(renderGrade)}
        </ScrollView>
      </View>

      {isChecking ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B6914" />
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

      {/* КРАСИВОЕ ВСПЛЫВАЮЩЕЕ ОКНО (MODAL) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSubject?.subject}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#5D4D35" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Выберите подходящий учебник:</Text>

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
                      <Text style={styles.soonBadge}>Скоро</Text>
                    ) : isDownloaded ? (
                      <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    ) : (
                      <Ionicons name="cloud-download-outline" size={24} color="#8B6914" />
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
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  
  headerRow: { alignItems: 'center', marginBottom: 20 },
  logo: { fontSize: 26, fontWeight: 'bold', color: '#8B6914', textAlign: 'center', letterSpacing: 1 },
  tagline: { fontSize: 14, color: '#6B5D4F', textAlign: 'center', marginTop: 4 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, marginHorizontal: 16, paddingHorizontal: 12, marginBottom: 20, borderWidth: 1, borderColor: '#D4C4A8', height: 46 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#2C2416' },

  gradesWrapper: { height: 60, marginBottom: 10 },
  gradesContainer: { paddingHorizontal: 16, gap: 10, alignItems: 'center' },
  gradeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8DCC8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  gradeButtonActive: { backgroundColor: '#8B6914', borderColor: '#6B5D4F' },
  gradeText: { fontSize: 16, fontWeight: '600', color: '#6B5D4F' },
  gradeTextActive: { color: '#F5F0E8' },
  
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8DCC8', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#D4C4A8' },
  iconContainer: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#D4C4A8' },
  cardDisabled: { opacity: 0.6, backgroundColor: '#DDD5C5' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#2C2416' },
  cardTitleDisabled: { color: '#8A7E6E' },
  cardSubtitle: { fontSize: 13, color: '#6B5D4F', marginTop: 2 },
  soonBadge: { fontSize: 12, color: '#8B6914', backgroundColor: '#F5F0E8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#8A7E6E', fontSize: 16 },

  // СТИЛИ ДЛЯ ВСПЛЫВАЮЩЕГО ОКНА (MODAL)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', // Прижимаем окно к низу
  },
  modalContent: {
    backgroundColor: '#F8F6EF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%', // Чтобы окно не закрывало весь экран
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5D4D35',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#8C7653',
    marginBottom: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5DEC9',
  },
  modalItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#F0F0F0',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C2416',
    marginBottom: 4,
  },
  modalItemSub: {
    fontSize: 14,
    color: '#8C7653',
  },
});