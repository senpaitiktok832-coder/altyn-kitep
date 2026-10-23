import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { books } from '../../../data/books';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { useState, useEffect } from 'react';

export default function BookScreen() {
  const { id } = useLocalSearchParams();
  const book = books.find((b) => b.id === id);
  
  const [htmlUri, setHtmlUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!book || !book.url) return;

    const preparePdf = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const fileUri = FileSystem.cacheDirectory + `${id}.pdf`;
        const htmlFileUri = FileSystem.cacheDirectory + `viewer-${id}.html`;

        // 1. Очищаем старые файлы
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true });
        const htmlInfo = await FileSystem.getInfoAsync(htmlFileUri);
        if (htmlInfo.exists) await FileSystem.deleteAsync(htmlFileUri, { idempotent: true });

        // 2. Скачиваем
        const downloadRes = await FileSystem.downloadAsync(book.url, fileUri, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        if (downloadRes.status !== 200) throw new Error(`Ошибка сервера: ${downloadRes.status}`);

        // 3. Проверяем размер (если меньше 10 КБ - это точно не книга, а страница ошибки)
        const downloadedInfo = await FileSystem.getInfoAsync(fileUri);
        if (downloadedInfo.size < 10000) {
           throw new Error('Файл слишком маленький. GitHub заблокировал скачивание (возможно, из-за VPN).');
        }

        // 4. Проверяем формат файла (настоящий PDF начинается с "%PDF")
        const base64Header = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
          length: 4
        });
        if (!atob(base64Header).includes('%PDF')) {
           throw new Error('Скачался не PDF. Проверьте ссылку на GitHub.');
        }

        // 5. Генерируем HTML для локального просмотра
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
              <style>
                body { margin: 0; padding: 0; background-color: #525659; }
                #pdf-container { width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 10px 0; }
                canvas { max-width: 100%; height: auto; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }
              </style>
              <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
            </head>
            <body>
              <div id="pdf-container"></div>
              <script>
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                
                (async function() {
                  try {
                    const pdf = await pdfjsLib.getDocument('${fileUri}').promise;
                    const container = document.getElementById('pdf-container');
                    const dpr = window.devicePixelRatio || 1;
                    const targetWidth = window.innerWidth - 20;

                    for (let i = 1; i <= pdf.numPages; i++) {
                      const page = await pdf.getPage(i);
                      const unscaledViewport = page.getViewport({ scale: 1.0 });
                      const finalScale = (targetWidth / unscaledViewport.width) * dpr; 
                      const viewport = page.getViewport({ scale: finalScale });
                      
                      const canvas = document.createElement('canvas');
                      canvas.height = viewport.height;
                      canvas.width = viewport.width;
                      canvas.style.width = targetWidth + 'px';
                      canvas.style.height = 'auto';
                      
                      container.appendChild(canvas);
                      const context = canvas.getContext('2d');
                      await page.render({ canvasContext: context, viewport: viewport }).promise;
                    }
                  } catch (err) {
                    document.body.innerHTML = '<h2 style="color:white; text-align:center; margin-top:50px;">Ошибка в PDF: ' + err.message + '</h2>';
                  }
                })();
              </script>
            </body>
          </html>
        `;

        await FileSystem.writeAsStringAsync(htmlFileUri, htmlContent);
        setHtmlUri(htmlFileUri);
      } catch (e) {
        console.error('DOWNLOAD_ERROR:', e);
        setErrorMsg(e.message || 'Ошибка при загрузке книги');
      } finally {
        setLoading(false);
      }
    };

    preparePdf();
  }, [id, book]);

  if (!book) return <Text style={styles.error}>Книга не найдена</Text>;

  if (!book.url) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.soon}>Скоро появится</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B6914" />
          <Text style={styles.loadingText}>Скачиваем учебник...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Text style={styles.error}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.replace(`/book/${id}`)}>
            <Text style={styles.retryText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      ) : htmlUri ? (
        <WebView
          style={styles.viewer}
          originWhitelist={['*']}
          source={{ uri: htmlUri }}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          setBuiltInZoomControls={true}
          setDisplayZoomControls={false}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#2C2416' },
  backText: { fontSize: 16, color: '#8B6914', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2C2416', textAlign: 'center', marginTop: 20 },
  soon: { fontSize: 16, color: '#6B5D4F', textAlign: 'center', marginTop: 12 },
  error: { fontSize: 16, color: 'red', textAlign: 'center', paddingHorizontal: 20, marginBottom: 20, lineHeight: 24 },
  viewer: { flex: 1, backgroundColor: '#525659' },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B5D4F' },
  retryBtn: { backgroundColor: '#8B6914', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFF', fontWeight: 'bold' }
});