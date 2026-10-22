import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { books } from '../../data/books';
import { useState } from 'react';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function HomeScreen() {
  const [selectedGrade, setSelectedGrade] = useState(5);

  const filteredBooks = books.filter((b) => b.grade === selectedGrade);

  const renderGrade = (grade) => (
    <TouchableOpacity
      key={grade}
      style={[
        styles.gradeButton,
        selectedGrade === grade && styles.gradeButtonActive
      ]}
      onPress={() => setSelectedGrade(grade)}
    >
      <Text style={[
        styles.gradeText,
        selectedGrade === grade && styles.gradeTextActive
      ]}>
        {grade}
      </Text>
    </TouchableOpacity>
  );

  const renderBook = ({ item }) => {
    const isAvailable = item.url && item.url.length > 0;
    
    if (!isAvailable) {
      return (
        <View style={[styles.card, styles.cardDisabled]}>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, styles.cardTitleDisabled]}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subject}</Text>
          </View>
          <Text style={styles.soonBadge}>Скоро</Text>
        </View>
      );
    }

    return (
      <Link href={`/book/${item.id}`} asChild>
        <TouchableOpacity style={styles.card}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subject}</Text>
          </View>
          <Text style={styles.cardArrow}>→</Text>
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Алтын китеп</Text>
      <Text style={styles.tagline}>Электронная библиотека школы</Text>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.gradesScroll}
        contentContainerStyle={styles.gradesContainer}
      >
        {GRADES.map(renderGrade)}
      </ScrollView>

      <FlatList
        data={filteredBooks}
        renderItem={renderBook}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8B6914',
    textAlign: 'center',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#6B5D4F',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  gradesScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  gradesContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  gradeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8DCC8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gradeButtonActive: {
    backgroundColor: '#8B6914',
    borderColor: '#6B5D4F',
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5D4F',
  },
  gradeTextActive: {
    color: '#F5F0E8',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8DCC8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4C4A8',
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: '#DDD5C5',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C2416',
  },
  cardTitleDisabled: {
    color: '#8A7E6E',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B5D4F',
    marginTop: 4,
  },
  cardArrow: {
    fontSize: 20,
    color: '#8B6914',
  },
  soonBadge: {
    fontSize: 12,
    color: '#8B6914',
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});