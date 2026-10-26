import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { books } from '../../../data/books';

export default function BookScreen() {
  const { id } = useLocalSearchParams();
  const book = books.find((b) => b.id === id);
  
  const [htmlContent, setHtmlContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [savedPage, setSavedPage] = useState(null);

  const webViewRef = useRef(null);

  useEffect(() => {
    if (!book || !book.url) return;
    
    const preparePdf = async () => {
      setLoading(true); 
      setErrorMsg(null);
      try {
        const fileUri = FileSystem.documentDirectory + `${id}.pdf`;
        
        // 1. Скачиваем файл, если его нет
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          const downloadRes = await FileSystem.downloadAsync(book.url, fileUri, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (downloadRes.status !== 200) throw new Error(`Ошибка сети: ${downloadRes.status}`);
        }

        // 2. Читаем файл в Base64 (чтобы WebView не искал его на телефоне)
        const base64Data = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        const pdfDataUri = `data:application/pdf;base64,${base64Data}`;

        let savedPageVal = 1;
        try {
          const bookmarkFileUri = FileSystem.documentDirectory + `bookmark_${id}.json`;
          const bookmarkInfo = await FileSystem.getInfoAsync(bookmarkFileUri);
          if (bookmarkInfo.exists) {
            const parsed = JSON.parse(await FileSystem.readAsStringAsync(bookmarkFileUri));
            if (parsed.page) savedPageVal = parsed.page;
          }
        } catch (e) {}
        setSavedPage(savedPageVal);

        const htmlString = `
          <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
          <style>
            body { margin: 0; padding: 0; background-color: #525659; display: flex; justify-content: center; } 
            #pdf-container { display: flex; justify-content: center; width: 100%; padding-bottom: 120px; } 
            canvas { max-width: 100%; height: auto; margin-top: 10px; } 
            #status { color: #fff; text-align: center; margin-top: 50px; font-family: sans-serif; }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script></head>
          <body><div id="status">Загрузка PDF...</div><div id="pdf-container"></div>
          <script>
            let pdfDoc = null, pageNum = 1, rendering = false;
            window.initPdf = async function(base64Data, startPage) {
              try {
                if (typeof pdfjsLib === 'undefined') throw new Error('Нет интернета');
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                // Загружаем PDF из Base64 строки
                pdfDoc = await pdfjsLib.getDocument({ data: atob(base64Data) }).promise;
                document.getElementById('status').style.display = 'none';
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'INIT', totalPages: pdfDoc.numPages }));
                renderPage(startPage || 1);
              } catch (err) { document.getElementById('status').innerText = 'Ошибка PDF: ' + err.message; }
            }
            window.renderPage = async function(num) {
              if (!pdfDoc || rendering || num < 1 || num > pdfDoc.numPages) return;
              rendering = true; pageNum = num;
              const container = document.getElementById('pdf-container');
              container.innerHTML = '<div id="status">Загрузка страницы...</div>';
              try {
                const page = await pdfDoc.getPage(pageNum);
                const targetWidth = window.innerWidth - 10;
                const viewport = page.getViewport({ scale: 1.0 });
                const dpr = window.devicePixelRatio || 2;
                const finalViewport = page.getViewport({ scale: (targetWidth / viewport.width) * Math.max(dpr, 2.0) });
                const canvas = document.createElement('canvas');
                canvas.height = finalViewport.height; canvas.width = finalViewport.width;
                canvas.style.width = targetWidth + 'px'; canvas.style.height = 'auto';
                container.innerHTML = ''; container.appendChild(canvas);
                const context = canvas.getContext('2d', { alpha: false });
                await page.render({ canvasContext: context, viewport: finalViewport }).promise;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAGE_CHANGED', page: pageNum }));
              } catch (e) { container.innerHTML = '<div id="status">Ошибка</div>'; } finally { rendering = false; }
            }
          </script></body></html>`;
          
        setHtmlContent(htmlString);
        
        // Передаем Base64 в WebView, а не путь к файлу
        setTimeout(() => { 
          if (webViewRef.current) {
            // Оборачиваем в try-catch на случай, если строка слишком длинная
            try {
              webViewRef.current.injectJavaScript(`window.initPdf('${base64Data}', ${savedPageVal}); true;`);
            } catch(err) {
              console.log("Строка слишком длинная, используем альтернативный метод");
            }
          }
        }, 1000);

      } catch (e) { 
        setErrorMsg(e.message || 'Ошибка'); 
      } finally { 
        setLoading(false); 
      }
    };
    
    preparePdf();
  }, [id, book]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'INIT') setTotalPages(data.totalPages);
      else if (data.type === 'PAGE_CHANGED') setCurrentPage(data.page);
    } catch (e) {}
  };

  const changePage = (dir) => {
    const newPage = currentPage + dir;
    if (newPage >= 1 && newPage <= totalPages) webViewRef.current.injectJavaScript(`window.renderPage(${newPage}); true;`);
  };

  const saveBookmark = async () => {
    await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + `bookmark_${id}.json`, JSON.stringify({ page: currentPage }));
    setSavedPage(currentPage); 
    Alert.alert("Готово", `Закладка на стр. ${currentPage}!`);
  };

  const goToBookmark = () => { 
    if (savedPage) webViewRef.current.injectJavaScript(`window.renderPage(${savedPage}); true;`); 
  };

  const askAI = () => { 
    router.push({ pathname: '/ai', params: { contextBook: book.title, contextPage: currentPage } }); 
  };

  if (!book) return <Text>Книга не найдена</Text>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
        <TouchableOpacity onPress={saveBookmark} style={styles.headerIcon}>
          <Ionicons name={savedPage === currentPage ? "bookmark" : "bookmark-outline"} size={24} color="#C29B57" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#C29B57" />
          <Text style={{ marginTop: 10, color: '#8E8E93' }}>Обработка PDF...</Text>
        </View>
      ) : errorMsg ? (
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 50 }}>{errorMsg}</Text>
      ) : htmlContent ? (
        <View style={{ flex: 1 }}>
          <WebView 
            ref={webViewRef} 
            style={{ flex: 1, backgroundColor: '#525659', opacity: 0.99 }}
            originWhitelist={['*']} 
            source={{ html: htmlContent }} 
            onMessage={onMessage} 
            allowFileAccess={true} 
            allowFileAccessFromFileURLs={true} 
            allowUniversalAccessFromFileURLs={true} 
            javaScriptEnabled={true} 
          />
          
          <TouchableOpacity style={styles.fab} onPress={askAI}>
            <Ionicons name="sparkles" size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => changePage(-1)} disabled={currentPage <= 1}>
              <Ionicons name="chevron-back" size={28} color={currentPage <= 1 ? "#C7C7CC" : "#007AFF"} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.pageText}>{currentPage} / {totalPages}</Text>
              {savedPage && (
                <TouchableOpacity onPress={goToBookmark}>
                  <Text style={{ color: '#C29B57', fontSize: 12, fontWeight: 'bold' }}>К закладке ({savedPage})</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => changePage(1)} disabled={currentPage >= totalPages}>
              <Ionicons name="chevron-forward" size={28} color={currentPage >= totalPages ? "#C7C7CC" : "#007AFF"} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#000' },
  backBtn: { padding: 4, marginLeft: -4 },
  headerIcon: { padding: 8 },
  fab: { position: 'absolute', bottom: 80, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C29B57', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F2F2F7', borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 20, paddingBottom: 35 },
  pageText: { fontSize: 16, fontWeight: '600', color: '#000' }
});