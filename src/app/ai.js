import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

export default function AIScreen() {
  const { contextBook, contextPage } = useLocalSearchParams();
  
  const initialMessage = contextBook 
    ? `Я вижу, ты читаешь «${contextBook}» (стр. ${contextPage}). Как я могу помочь?` 
    : 'Салам! Мен сенин ИИ-жардамчыңмын. Кандай суроолоруң бар?';

  const [messages, setMessages] = useState([{ id: '1', role: 'assistant', content: initialMessage }]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: inputText }]);
    setInputText('');
    setLoading(true);

    const apiKey = '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';
    const systemPrompt = contextBook 
      ? `Ты полезный школьный помощник. Пользователь читает книгу "${contextBook}" на стр. ${contextPage}. Отвечай кратко.` 
      : 'Ты полезный школьный помощник. Отвечай кратко.';

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: inputText }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: data.choices[0].message.content }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Ошибка: ' + error.message }]);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#C29B57" /></TouchableOpacity>
              <Text style={styles.headerTitle}>ИИ-Помощник</Text><View style={{ width: 24 }} />
            </View>
            <FlatList data={messages} keyExtractor={i => i.id} contentContainerStyle={styles.chatList} renderItem={({ item }) => {
              const isUser = item.role === 'user';
              return (
                <View style={[styles.messageBubble, { backgroundColor: isUser ? '#C29B57' : '#F2F2F7', alignSelf: isUser ? 'flex-end' : 'flex-start', borderBottomRightRadius: isUser ? 4 : 16, borderBottomLeftRadius: isUser ? 16 : 4 }]}>
                  <Text style={{ fontSize: 16, lineHeight: 22, color: isUser ? '#FFF' : '#000' }}>{item.content}</Text>
                </View>
              );
            }} />
            {loading && <View style={styles.loadingContainer}><ActivityIndicator size="small" color="#C29B57" /><Text style={{ color: '#8E8E93', marginLeft: 8 }}>ИИ думает...</Text></View>}
            <View style={styles.inputContainer}>
              <TextInput style={styles.input} placeholder="Задай вопрос..." placeholderTextColor="#8E8E93" value={inputText} onChangeText={setInputText} multiline />
              <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={loading}><Ionicons name="arrow-up" size={20} color="#FFF" /></TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 50, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  chatList: { padding: 16, paddingBottom: 20 },
  messageBubble: { maxWidth: '85%', padding: 14, borderRadius: 16, marginBottom: 12 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  inputContainer: { flexDirection: 'row', padding: 12, paddingBottom: 30, borderTopWidth: 1, borderTopColor: '#E5E5EA', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16, maxHeight: 120, color: '#000' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#C29B57', justifyContent: 'center', alignItems: 'center', marginLeft: 10, marginBottom: 4 },
});