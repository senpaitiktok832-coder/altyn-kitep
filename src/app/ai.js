import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AIScreen() {
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', content: 'Салам! Мен сенин ИИ-жардамчыңмын. Кандай суроолоруң бар? (Привет! Я твой ИИ-помощник. Какие есть вопросы?)' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    // Берем ключ из файла .env
    const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: 'Ты полезный школьный помощник. Всегда отвечай сразу на русском языке. Если пользователь захочет, ты можешь перейти на кыргызский язык. Отвечай кратко и понятно.' },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: inputText }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.choices[0].message.content }]);
      } else throw new Error(data.error?.message || 'Ошибка');
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Ошибка сети. Попробуй еще раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#C29B57" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ИИ-Помощник</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList data={messages} renderItem={renderMessage} keyExtractor={item => item.id} contentContainerStyle={styles.chatList} />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#C29B57" />
          <Text style={styles.loadingText}>ИИ думает...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Задай вопрос..." placeholderTextColor="#888" value={inputText} onChangeText={setInputText} multiline />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={loading}>
            <Ionicons name="arrow-up" size={20} color="#121212" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  backBtn: { padding: 4 },
  chatList: { padding: 16, paddingBottom: 20 },
  messageBubble: { maxWidth: '85%', padding: 14, borderRadius: 16, marginBottom: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#C29B57', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#F2F2F7', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16, lineHeight: 22 },
  userText: { color: '#FFF' },
  aiText: { color: '#000' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  loadingText: { color: '#C29B57', fontSize: 14 },
  inputContainer: { flexDirection: 'row', padding: 12, paddingBottom: 30, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E5EA', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, maxHeight: 100, color: '#000' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#C29B57', justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 2 },
});