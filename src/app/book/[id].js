import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { books } from '../../../data/books';

export default function BookScreen() {
  const { id } = useLocalSearchParams();
  const book = books.find((b) => b.id === id);
  
  const [htmlUri, setHtmlUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  
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
        const htmlFileUri = FileSystem.cacheDirectory + `viewer-${id}-${Date.now()}.html`;
        const bookmarkFileUri = FileSystem.documentDirectory + `bookmark_${id}.json`;

        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        let needsDownload = true;

        if (fileInfo.exists) {
          try {
            const base64Header = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
              length: 4
            });
            if (atob(base64Header).includes('%PDF')) {
              needsDownload = false;
              setIsDownloaded(true); 
            } else {
              await FileSystem.deleteAsync(fileUri, { idempotent: true });
            }
          } catch (e) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
          }
        }

        if (needsDownload) {
          const downloadRes = await FileSystem.downloadAsync(book.url, fileUri, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (downloadRes.status !== 200) throw new Error(`Ошибка скачивания: ${downloadRes.status}`);
          setIsDownloaded(true);
        }

        let savedPageVal = 1;
        try {
          const bookmarkInfo = await FileSystem.getInfoAsync(bookmarkFileUri);
          if (bookmarkInfo.exists) {
            const bookmarkData = await FileSystem.readAsStringAsync(bookmarkFileUri);
            if (bookmarkData) {
              const parsed = JSON.parse(bookmarkData);
              if (parsed.page) savedPageVal = parsed.page;
            }
          }
        } catch (e) {}
        setSavedPage(savedPageVal);

        // ГЕНЕРИРУЕМ HTML (ПОСТРАНИЧНЫЙ ПРОСМОТР)
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
              <style>
                body { margin: 0; padding: 0; background-color: #525659; display: flex; justify-content: center; }
                #pdf-container { display: flex; justify-content: center; width: 100%; padding-bottom: 80px; }
                canvas { max-width: 100%; height: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5); margin-top: 10px; }
                #status { color: #fff; text-align: center; margin-top: 50px; font-family: sans-serif; font-size: 16px; }
              </style>
              <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
            </head>
            <body>
              <div id="status">Загрузка документа...</div>
              <div id="pdf-container"></div>
              <script>
                let pdfDoc = null;
                let pageNum = 1;
                let rendering = false;

                window.initPdf = async function(uri, startPage) {
                  try {
                    if (typeof pdfjsLib === 'undefined') throw new Error('Нет интернета');
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    
                    pdfDoc = await pdfjsLib.getDocument(uri).promise;
                    document.getElementById('status').style.display = 'none';
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'INIT', totalPages: pdfDoc.numPages }));
                    renderPage(startPage || 1);
                  } catch (err) {
                    document.getElementById('status').innerText = 'Ошибка: ' + err.message;
                    document.getElementById('status').style.color = '#ff6b6b';
                  }
                }

                window.renderPage = async function(num) {
                  if (!pdfDoc || rendering) return;
                  if (num < 1 || num > pdfDoc.numPages) return;
                  
                  rendering = true;
                  pageNum = num;
                  const container = document.getElementById('pdf-container');
                  container.innerHTML = '<div id="status">Загрузка страницы...</div>';
                  
                  try {
                    const page = await pdfDoc.getPage(pageNum);
                    const targetWidth = window.innerWidth - 10;
                    const viewport = page.getViewport({ scale: 1.0 });
                    const scale = targetWidth / viewport.width;
                    const finalViewport = page.getViewport({ scale: scale });
                    
                    const canvas = document.createElement('canvas');
                    canvas.height = finalViewport.height;
                    canvas.width = finalViewport.width;
                    canvas.style.width = '100%';
                    
                    container.innerHTML = '';
                    container.appendChild(canvas);
                    
                    const context = canvas.getContext('2d');
                    await page.render({ canvasContext: context, viewport: finalViewport }).promise;
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAGE_CHANGED', page: pageNum }));
                  } catch (e) {
                    container.innerHTML = '<div id="status" style="color:red">Ошибка отрисовки</div>';
                  } finally {
                    rendering = false;
                  }
                }
              </script>
            </body>
          </html>
        `;

        await FileSystem.writeAsStringAsync(htmlFileUri, htmlContent);
        setHtmlUri(htmlFileUri);
        
        // Сохраняем URI для передачи в WebView
        setTimeout(() => {
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`window.initPdf('${fileUri}', ${savedPageVal}); true;`);
          }
        }, 500);

      } catch (e) {
        setErrorMsg(e.message || 'Ошибка при загрузке');
      } finally {
        setLoading(false);
      }
    };

    preparePdf();
  }, [id, book]);

  const onMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'INIT') {
        setTotalPages(data.totalPages);
      } else if (data.type === 'PAGE_CHANGED') {
        setCurrentPage(data.page);
      }
    } catch (e) {}
  };

  const changePage = (direction) => {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
      webViewRef.current.injectJavaScript(`window.renderPage(${newPage}); true;`);
    }
  };

  const saveBookmark = async () => {
    try {
      const bookmarkFileUri = FileSystem.documentDirectory + `bookmark_${id}.json`;
      await FileSystem.writeAsStringAsync(bookmarkFileUri, JSON.stringify({ page: currentPage }));
      setSavedPage(currentPage);
      Alert.alert("Готово", `Закладка сохранена на странице ${currentPage}!`);
    } catch (e) {
      Alert.alert("Ошибка", "Не удалось сохранить закладку.");
    }
  };

  const goToBookmark = () => {
    if (savedPage) {
      webViewRef.current.injectJavaScript(`window.renderPage(${savedPage}); true;`);
    }
  };

  const confirmDelete = () => {
    Alert.alert("Удалить книгу?", "Книга и закладки будут удалены.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: async () => {
          await FileSystem.deleteAsync(FileSystem.documentDirectory + `${id}.pdf`, { idempotent: true });
          await FileSystem.deleteAsync(FileSystem.documentDirectory + `bookmark_${id}.json`, { idempotent: true });
          router.back();
      }}
    ]);
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#C29B57" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
        
        <TouchableOpacity onPress={saveBookmark} style={styles.headerIcon}>
          <Ionicons name={savedPage === currentPage ? "bookmark" : "bookmark-outline"} size={24} color="#C29B57" />
        </TouchableOpacity>

        {isDownloaded && (
          <TouchableOpacity onPress={confirmDelete} style={styles.headerIcon}>
            <Ionicons name="trash-outline" size={22} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C29B57" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.center}>
          <Text style={styles.error}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.replace(`/book/${id}`)}>
            <Text style={styles.retryText}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      ) : htmlUri ? (
        <View style={{ flex: 1 }}>
          <WebView
            ref={webViewRef}
            style={styles.viewer}
            originWhitelist={['*']}
            source={{ uri: htmlUri }}
            onMessage={onMessage}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            setBuiltInZoomControls={true}
            setDisplayZoomControls={false}
          />
          
          {/* НИЖНЯЯ ПАНЕЛЬ НАВИГАЦИИ */}
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => changePage(-1)} style={styles.navBtn} disabled={currentPage <= 1}>
              <Ionicons name="chevron-back" size={28} color={currentPage <= 1 ? "#C7C7CC" : "#007AFF"} />
            </TouchableOpacity>
            
            <View style={styles.pageIndicator}>
              <Text style={styles.pageText}>{currentPage} / {totalPages}</Text>
              {savedPage && (
                <TouchableOpacity onPress={goToBookmark} style={{ marginTop: 5 }}>
                  <Text style={{ color: '#C29B57', fontSize: 12, fontWeight: 'bold' }}>К закладке (стр. {savedPage})</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={() => changePage(1)} style={styles.navBtn} disabled={currentPage >= totalPages}>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#000' },
  backBtn: { padding: 4, marginLeft: -4 },
  headerIcon: { padding: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center', marginTop: 20 },
  soon: { fontSize: 16, color: '#8E8E93', textAlign: 'center', marginTop: 12 },
  error: { fontSize: 16, color: '#FF3B30', textAlign: 'center', paddingHorizontal: 20, marginBottom: 20, lineHeight: 24 },
  viewer: { flex: 1, backgroundColor: '#525659' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#8E8E93' },
  retryBtn: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFF', fontWeight: 'bold' },
  
  // Стили для нижней панели листания
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingVertical: 10,
    paddingHorizontal: 20,
    paddingBottom: 35, // Отступ для iPhone
  },
  navBtn: {
    padding: 10,
  },
  pageIndicator: {
    alignItems: 'center',
  },
  pageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  }
});