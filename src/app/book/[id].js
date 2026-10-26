import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { books } from '../../../data/books';
import { useTheme } from '../../context/ThemeContext';

export default function BookScreen() {
  const { theme, isDark } = useTheme();
  const { id } = useLocalSearchParams();
  const book = books.find((b) => b.id === id);
  
  const [htmlUri, setHtmlUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [savedPage, setSavedPage] = useState(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [pageText, setPageText] = useState(''); // Храним текст текущей страницы

  const webViewRef = useRef(null);

  useEffect(() => {
    return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); };
  }, []);

  const toggleOrientation = async () => {
    if (isLandscape) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsLandscape(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsLandscape(true);
    }
  };

  useEffect(() => {
    if (!book || !book.url) return;
    const preparePdf = async () => {
      setLoading(true); setErrorMsg(null);
      try {
        const fileUri = FileSystem.documentDirectory + `${id}.pdf`;
        const htmlFileUri = FileSystem.cacheDirectory + `viewer-${id}-${Date.now()}.html`;
        const bookmarkFileUri = FileSystem.documentDirectory + `bookmark_${id}.json`;

        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        let needsDownload = true;

        if (fileInfo.exists) {
          const base64Header = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64, length: 4 });
          if (atob(base64Header).includes('%PDF')) { needsDownload = false; setIsDownloaded(true); }
          else await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }

        if (needsDownload) {
          const downloadRes = await FileSystem.downloadAsync(book.url, fileUri, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (downloadRes.status !== 200) throw new Error(`Ошибка скачивания: ${downloadRes.status}`);
          setIsDownloaded(true);
        }

        let savedPageVal = 1;
        try {
          const bookmarkInfo = await FileSystem.getInfoAsync(bookmarkFileUri);
          if (bookmarkInfo.exists) {
            const parsed = JSON.parse(await FileSystem.readAsStringAsync(bookmarkFileUri));
            if (parsed.page) savedPageVal = parsed.page;
          }
        } catch (e) {}
        setSavedPage(savedPageVal);

        // Передаем isDark в HTML для инверсии цветов
        const htmlContent = `
          <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
          <style>
            body { margin: 0; padding: 0; background-color: ${isDark ? '#121212' : '#525659'}; display: flex; justify-content: center; } 
            #pdf-container { display: flex; justify-content: center; width: 100%; padding-bottom: 120px; } 
            canvas { max-width: 100%; height: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5); margin-top: 10px; 
              /* Инверсия цветов для ночного чтения */
              ${isDark ? 'filter: invert(0.9) hue-rotate(180deg);' : ''} 
            } 
            #status { color: #fff; text-align: center; margin-top: 50px; }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script></head>
          <body><div id="status">Загрузка...</div><div id="pdf-container"></div>
          <script>
            let pdfDoc = null, pageNum = 1, rendering = false;
            window.initPdf = async function(uri, startPage) {
              try {
                if (typeof pdfjsLib === 'undefined') throw new Error('Нет интернета');
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                pdfDoc = await pdfjsLib.getDocument(uri).promise;
                document.getElementById('status').style.display = 'none';
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'INIT', totalPages: pdfDoc.numPages }));
                renderPage(startPage || 1);
              } catch (err) { document.getElementById('status').innerText = 'Ошибка: ' + err.message; }
            }
            window.renderPage = async function(num) {
              if (!pdfDoc || rendering || num < 1 || num > pdfDoc.numPages) return;
              rendering = true; pageNum = num;
              const container = document.getElementById('pdf-container');
              container.innerHTML = '<div id="status">Загрузка...</div>';
              try {
                const page = await pdfDoc.getPage(pageNum);
                const targetWidth = window.innerWidth - 10;
                const viewport = page.getViewport({ scale: 1.0 });
                const dpr = window.devicePixelRatio || 2;
                const finalViewport = page.getViewport({ scale: (targetWidth / viewport.width) * Math.max(dpr, 2.5) });
                const canvas = document.createElement('canvas');
                canvas.height = finalViewport.height; canvas.width = finalViewport.width;
                canvas.style.width = targetWidth + 'px'; canvas.style.height = 'auto';
                container.innerHTML = ''; container.appendChild(canvas);
                const context = canvas.getContext('2d', { alpha: false });
                context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
                await page.render({ canvasContext: context, viewport: finalViewport }).promise;
                
                // Извлекаем текст страницы для ИИ
                const textContent = await page.getTextContent();
                const text = textContent.items.map(item => item.str).join(' ');
                
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAGE_CHANGED', page: pageNum, text: text }));
              } catch (e) { container.innerHTML = '<div id="status">Ошибка</div>'; }
              finally { rendering = false; }
            }
          </script></body></html>`;
        await FileSystem.writeAsStringAsync(htmlFileUri, htmlContent);
        setHtmlUri(htmlFileUri);
        setTimeout(() => { if (webViewRef.current) webViewRef.current.injectJavaScript(`window.initPdf('${fileUri}', ${savedPageVal}); true;`); }, 500);
      } catch (e) { setErrorMsg(e.message || 'Ошибка'); } finally { setLoading(false); }
    };
    preparePdf();
  }, [id, book, isDark]); // Перерендериваем при смене темы

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'INIT') setTotalPages(data.totalPages);
      else if (data.type === 'PAGE_CHANGED') {
        setCurrentPage(data.page);
        if (data.text) setPageText(data.text); // Сохраняем текст
      }
    } catch (e) {}
  };

  const changePage = (dir) => {
    const newPage = currentPage + dir;
    if (newPage >= 1 && newPage <= totalPages) webViewRef.current.injectJavaScript(`window.renderPage(${newPage}); true;`);
  };

  const saveBookmark = async () => {
    await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + `bookmark_${id}.json`, JSON.stringify({ page: currentPage }));
    setSavedPage(currentPage); Alert.alert("Готово", `Закладка на стр. ${currentPage}!`);
  };

  const goToBookmark = () => { if (savedPage) webViewRef.current.injectJavaScript(`window.renderPage(${savedPage}); true;`); };

  const askAI = () => { router.push({ pathname: '/ai', params: { contextBook: book.title, contextPage: currentPage } }); };
  
  // Кнопка "Объясни страницу"
  const explainPage = () => {
    if (!pageText || pageText.trim().length < 10) {
      return Alert.alert("Ошибка", "Не удалось распознать текст на этой странице. Возможно, это картинка.");
    }
    router.push({ 
      pathname: '/ai', 
      params: { 
        contextBook: book.title, 
        contextPage: currentPage,
        pageTextToExplain: pageText.substring(0, 1500) // Обрезаем, чтобы не превышать лимиты
      } 
    });
  };

  if (!book) return <Text style={{ color: theme.text }}>Книга не найдена</Text>;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="chevron-back" size={28} color={theme.accent} /></TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{book.title}</Text>
        <TouchableOpacity onPress={toggleOrientation} style={styles.headerIcon}><Ionicons name={isLandscape ? "contract-outline" : "expand-outline"} size={24} color={theme.accent} /></TouchableOpacity>
        <TouchableOpacity onPress={saveBookmark} style={styles.headerIcon}><Ionicons name={savedPage === currentPage ? "bookmark" : "bookmark-outline"} size={24} color={theme.accent} /></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color={theme.accent} style={{ flex: 1 }} /> : errorMsg ? <Text style={{ color: 'red', textAlign: 'center', marginTop: 50 }}>{errorMsg}</Text> : (
        <View style={{ flex: 1 }}>
          <WebView ref={webViewRef} style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#525659' }} originWhitelist={['*']} source={{ uri: htmlUri }} onMessage={onMessage} allowFileAccess={true} allowFileAccessFromFileURLs={true} allowUniversalAccessFromFileURLs={true} javaScriptEnabled={true} domStorageEnabled={true} />
          
          {/* Плавающие кнопки */}
          <View style={styles.fabContainer}>
            <TouchableOpacity style={[styles.fab, { backgroundColor: '#007AFF' }]} onPress={explainPage}>
              <Ionicons name="book" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fab, { backgroundColor: theme.accent }]} onPress={askAI}>
              <Ionicons name="sparkles" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {!isLandscape && (
            <View style={[styles.navBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
              <TouchableOpacity onPress={() => changePage(-1)} disabled={currentPage <= 1}><Ionicons name="chevron-back" size={28} color={currentPage <= 1 ? theme.subtext : "#007AFF"} /></TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.pageText, { color: theme.text }]}>{currentPage} / {totalPages}</Text>
                {savedPage && <TouchableOpacity onPress={goToBookmark}><Text style={{ color: theme.accent, fontSize: 12, fontWeight: 'bold' }}>К закладке ({savedPage})</Text></TouchableOpacity>}
              </View>
              <TouchableOpacity onPress={() => changePage(1)} disabled={currentPage >= totalPages}><Ionicons name="chevron-forward" size={28} color={currentPage >= totalPages ? theme.subtext : "#007AFF"} /></TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, gap: 8, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600' },
  backBtn: { padding: 4, marginLeft: -4 },
  headerIcon: { padding: 8 },
  
  fabContainer: { position: 'absolute', bottom: 80, right: 20, gap: 12 },
  fab: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 20, paddingBottom: 35 },
  pageText: { fontSize: 16, fontWeight: '600' }
});