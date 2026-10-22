import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { books } from '../../../data/books';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useState, useEffect } from 'react';

const localPdfs = {
  '5-math': require('../../../assets/books/5-math.pdf'),
};

export default function BookScreen() {
  const { id } = useLocalSearchParams();
  const book = books.find((b) => b.id === id);
  const [htmlUri, setHtmlUri] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!localPdfs[id]) return;

    const prepareWebView = async () => {
      try {
        const asset = Asset.fromModule(localPdfs[id]);
        await asset.downloadAsync();
        const pdfUri = asset.localUri;

        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <!-- Разрешаем масштабирование пальцами (до 5х) -->
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
              <style>
                body { margin: 0; padding: 0; background-color: #525659; }
                #pdf-container { width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 10px 0; }
                /* Запрещаем canvas вылезать за пределы экрана */
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
                    const pdf = await pdfjsLib.getDocument('${pdfUri}').promise;
                    const container = document.getElementById('pdf-container');
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                      const page = await pdf.getPage(i);
                      
                      // Считаем масштаб так, чтобы страница влезла в ширину экрана
                      const unscaledViewport = page.getViewport({ scale: 1.0 });
                      const scale = (window.innerWidth - 20) / unscaledViewport.width;
                      const viewport = page.getViewport({ scale: scale });
                      
                      const canvas = document.createElement('canvas');
                      canvas.height = viewport.height;
                      canvas.width = viewport.width;
                      
                      container.appendChild(canvas);
                      
                      const context = canvas.getContext('2d');
                      await page.render({
                        canvasContext: context,
                        viewport: viewport
                      }).promise;
                    }
                  } catch (err) {
                    document.body.innerHTML = '<h2 style="color:white; text-align:center; margin-top:50px;">Ошибка: ' + err.message + '</h2>';
                  }
                })();
              </script>
            </body>
          </html>
        `;

        const htmlFileUri = FileSystem.cacheDirectory + 'viewer.html';
        await FileSystem.writeAsStringAsync(htmlFileUri, htmlContent);
        setHtmlUri(htmlFileUri);
      } catch (e) {
        setErrorMsg(e.message || String(e));
      }
    };

    prepareWebView();
  }, [id]);

  if (!book) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Книга не найдена</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!localPdfs[id]) {
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

      {errorMsg ? (
        <View style={styles.center}>
          <Text style={styles.error}>Ошибка: {errorMsg}</Text>
        </View>
      ) : !htmlUri ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B6914" />
          <Text style={styles.loadingText}>Подготовка...</Text>
        </View>
      ) : (
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
      )}
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
  error: { fontSize: 18, color: '#8B6914', textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  viewer: { flex: 1 },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B5D4F' },
});