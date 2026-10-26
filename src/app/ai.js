import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function AIScreen() {
  const { theme } = useTheme();
  const { contextBook, contextPage, pageTextToExplain } = useLocalSearchParams();
  
  const initialMessage = contextBook 
    ? `Я вижу, ты читаешь «${contextBook}» (стр. ${contextPage}). Как я могу помочь?` 
    : 'Салам! Мен сенин ИИ-жардамчыңмын. Кандай суроолоруң бар?';

  const [messages, setMessages] = useState([{ id: '1', role: 'assistant', content: initialMessage }]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Автоматическая отправка текста, если мы пришли по кнопке "Объясни страницу"
  useEffect(() => {
    if (pageTextToExplain) {
      sendMessage(`Объясни кратко и понятно, о чем этот текст:\n\n"${pageTextToExplain}"`);
    }
  }, []);

  const sendMessage = async (textToSend = inputText) => {
    if (!textToSend.trim()) return;
    
    // Не добавляем дубликат сообщения, если это авто-отправка
    if (textToSend === inputText) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputText }]);
    } else {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: "Пожалуйста, объясни текст на этой странице." }]);
    }
    
    setInputText('');
    setLoading(true);

    const apiKey = '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';
    const systemPrompt = 'Ты полезный школьный помощник. Отвечай на русском, кратко и понятно.';

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: textToSend }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.choices[0].message.content }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Ошибка: ' + error.message }]);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={theme.accent} /></TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>ИИ-Помощник</Text><View style={{ width: 24 }} />
            </View>
            <FlatList data={messages} keyExtractor={i => i.id} contentContainerStyle={styles.chatList} renderItem={({ item }) => {
              const isUser = item.role === 'user';
              return (
                <View style={[styles.messageBubble, { backgroundColor: isUser ? theme.accent : theme.card, borderBottomRightRadius: isUser ? 4 : 16, borderBottomLeftRadius: isUser ? 16 : 4, alignSelf: isUser ? 'flex-end' : 'flex-start' }]}>
                  <Text style={{ fontSize: 16, lineHeight: 22, color: isUser ? '#FFF' : theme.text }}>{item.content}</Text>
                </View>
              );
            }} />
            {loading && <View style={styles.loadingContainer}><ActivityIndicator size="small" color={theme.accent} /><Text style={{ color: theme.subtext, marginLeft: 8 }}>ИИ думает...</Text></View>}
            <View style={[styles.inputContainer, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
              <TextInput style={[styles.input, { backgroundColor: theme.card, color: theme.text }]} placeholder="Задай вопрос..." placeholderTextColor={theme.subtext} value={inputText} onChangeText={setInputText} multiline />
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.accent }]} onPress={() => sendMessage()} disabled={loading}><Ionicons name="arrow-up" size={20} color="#121212" /></TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 10, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  chatList: { padding: 16, paddingBottom: 20 },
  messageBubble: { maxWidth: '85%', padding: 14, borderRadius: 16, marginBottom: 12 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  inputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'flex-end' },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16, maxHeight: 120 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 4 },
});