import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { FiChevronLeft, FiChevronRight, FiSettings, FiGrid, FiMaximize, FiMinimize, FiBookmark } from 'react-icons/fi';
import { IoMdArrowRoundBack } from 'react-icons/io';
import ReaderSettings from '../components/ReaderSettings';
import OverviewGrid from '../components/OverviewGrid';
import BookmarkSidebar from '../components/BookmarkSidebar';
import { bookService } from '../services';
import { Book } from '../services/bookService';

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs';

interface ReaderPageProps {
  book: Book;
  onBack: () => void;
}

const fontOptions = [
  { label: 'Default Font', value: 'inherit' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Roboto Slab', value: 'Roboto Slab, serif' },
];

const bgOptions = [
  { label: 'White', value: '#fff' },
  { label: 'Sepia', value: '#f6ecd9' },
  { label: 'Gray', value: '#f3f4f6' },
  { label: 'Dark', value: '#181818' },
];

interface Bookmark {
  page: number;
  note: string;
}

const ReaderPage: React.FC<ReaderPageProps> = ({ book, onBack }) => {
  // States
  const [bookUrl, setBookUrl] = useState<string>('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(16);
  const [font, setFont] = useState<string>(fontOptions[0].value);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<string>(bgOptions[0].value);
  const [customBg, setCustomBg] = useState<string>('');
  const [singlePage, setSinglePage] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showOverview, setShowOverview] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pageWidth, setPageWidth] = useState<number>(window.innerWidth * 0.6);

  const [showFloatingSettings, setShowFloatingSettings] = useState<boolean>(false);




  // Bookmark handlers
  const jumpToBookmark = (targetPage: number) => {
    console.log('[ReaderPage] Jumping to bookmark. Target page:', targetPage);
    // Resetting progress indicator by setting loading true can help trace re-render; adjust if needed
    setPage(targetPage);
    // After updating page state, React-PDF will render the corresponding page.
    // Additional debug: log current time to correlate with PDF render start
    console.log('[ReaderPage] Page state updated at', new Date().toISOString());
  };
  const removeBookmark = (targetPage: number) => setBookmarks(bms => bms.filter(bm => bm.page !== targetPage));
  const editBookmark = (targetPage: number, note: string) => setBookmarks(bms => bms.map(bm => bm.page === targetPage ? { ...bm, note } : bm));

  // Fullscreen toggle
  const handleFullscreen = () => {
    setIsFullscreen(f => !f);
  };

  // Resize handler for page width
  useEffect(() => {
    const handleResize = () => {
      setPageWidth(window.innerWidth * (singlePage ? 0.8 : 0.45));
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [singlePage]);

  // Fetch book details
  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await bookService.getBookDetails(book.bookId);
        console.log(response);
        if (response.success && response.data?.bookUrl) {
          const remoteUrl = response.data.bookUrl;
          console.log('Book URL:', remoteUrl);
          try {
            // Fetch the PDF as a Blob to bypass potential CORS restrictions
            const pdfRes = await fetch(remoteUrl);
            if (!pdfRes.ok) throw new Error('Failed to fetch PDF');
            const pdfBlob = await pdfRes.blob();
            const objectUrl = URL.createObjectURL(pdfBlob);
            // Store the generated object URL instead
            setBookUrl(objectUrl);
            // Revoke the object URL on unmount to free memory
            return () => URL.revokeObjectURL(objectUrl);
          } catch (pdfErr) {
            console.error('Error fetching PDF blob:', pdfErr);
            // Fallback: use direct URL if blob fetching fails
            setBookUrl(remoteUrl);
          }
        } else {
          setError(response.error || 'No book URL found for this book');
        }
      } catch (err) {
        console.error('Error fetching book details:', err);
        setError('Error loading book');
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [book.bookId]);

  // Handle PDF load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPage(1);
  };

  // Navigation logic
  const goPrev = () => {
    setPage(p => Math.max(1, p - (singlePage ? 1 : 2)));
  };

  const goNext = () => {
    if (numPages) {
      setPage(p => Math.min(numPages - (singlePage ? 0 : 1), p + (singlePage ? 1 : 2)));
    }
  };

  // Progress calculation
  const totalPages = numPages || 1;
  const currentPage = page;
  const progress = (currentPage / totalPages) * 100;

  // Background color
  const appliedBg = customBg || bgColor;

  // Truncate book name to 60 characters
  const truncatedBookName = book.bookName.length > 60
    ? `${book.bookName.substring(0, 60)}...`
    : book.bookName;

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: appliedBg, transition: 'background 0.3s', fontFamily: font, fontSize: `${fontSize}px` }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xl">กำลังโหลดหนังสือ...</div>
          </div>
        ) : error || !bookUrl ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xl text-red-500">{error || 'No book URL provided'}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center h-full w-full overflow-auto">
            <Document
              file={bookUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={() => setError('Error loading PDF')}
              className="flex flex-col items-center justify-center"
            >
              <div className="flex flex-row justify-center">
                {singlePage ? (
                  <Page
                    pageNumber={page}
                    width={pageWidth}
                    className="shadow-lg m-4"
                  />
                ) : (
                  <>
                    <Page
                      pageNumber={page}
                      width={pageWidth}
                      className="shadow-lg m-4"
                    />
                    {numPages && page + 1 <= numPages && (
                      <Page
                        pageNumber={page + 1}
                        width={pageWidth}
                        className="shadow-lg m-4"
                      />
                    )}
                  </>
                )}
              </div>
            </Document>
          </div>
        )}
        {/* Exit Fullscreen Button */}
        <button
          onClick={handleFullscreen}
          className="fixed top-6 right-6 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition z-50"
          title="Exit Fullscreen"
        >
          <FiMinimize size={28} />
        </button>
        {/* Floating Settings Button & Panel */}
        <div
          className="fixed top-6 right-24 z-50"
          onMouseEnter={() => setShowFloatingSettings(true)}
          onMouseLeave={() => setShowFloatingSettings(false)}
          tabIndex={0}
          onFocus={() => setShowFloatingSettings(true)}
          onBlur={() => setShowFloatingSettings(false)}
        >
          <button
            className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition"
            title="Settings"
            style={{ outline: 'none' }}
          >
            <FiSettings size={24} />
          </button>
          <div>
            {showFloatingSettings && (
              <div
                className="mt-3 w-[420px] max-w-full"
                style={{ position: 'absolute', right: 0, zIndex: 100 }}
              >
                <ReaderSettings
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  font={font}
                  setFont={setFont}
                  fontOptions={fontOptions}
                  bgColor={bgColor}
                  setBgColor={setBgColor}
                  customBg={customBg}
                  setCustomBg={setCustomBg}
                  bgOptions={bgOptions}
                  singlePage={singlePage}
                  setSinglePage={setSinglePage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full p-0 m-0"
      style={{ background: appliedBg, transition: 'background 0.3s', fontFamily: font, fontSize: `${fontSize}px` }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-none p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button className="text-white text-2xl" onClick={onBack}>
            <IoMdArrowRoundBack />
          </button>
          <span className="text-white text-xl font-bold ml-2">{truncatedBookName}</span>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowOverview(true)} title="Overview" className="text-white"><FiGrid size={22} /></button>
          <button onClick={() => setShowBookmarks(true)} title="Bookmarks" className="text-white"><FiBookmark size={22} /></button>
          <button onClick={handleFullscreen} title="Fullscreen" className="text-white">{isFullscreen ? <FiMinimize size={22} /> : <FiMaximize size={22} />}</button>
          <button onClick={() => setShowSettings((prev) => !prev)} title="Settings" className="text-white"><FiSettings size={22} /></button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <ReaderSettings
          fontSize={fontSize}
          setFontSize={setFontSize}
          font={font}
          setFont={setFont}
          fontOptions={fontOptions}
          bgColor={bgColor}
          setBgColor={setBgColor}
          customBg={customBg}
          setCustomBg={setCustomBg}
          bgOptions={bgOptions}
          singlePage={singlePage}
          setSinglePage={setSinglePage}
        />
      )}

      {/* Overview and Bookmarks */}
      {showOverview && (
        <OverviewGrid
          pages={Array.from({ length: numPages || 0 }, (_, i) => `Page ${i + 1}`)}
          bookmarks={bookmarks.map(bm => bm.page)}
          searchTerm=""
          onJump={(idx: number) => { setPage(idx + 1); setShowOverview(false); }}
          onClose={() => setShowOverview(false)}
        />
      )}
      {showBookmarks && (
        <BookmarkSidebar
          bookmarks={bookmarks}
          onJump={jumpToBookmark}
          onRemove={removeBookmark}
          onEdit={editBookmark}
          onClose={() => setShowBookmarks(false)}
        />
      )}

      {/* Main Reading Area */}
      <div className="p-8 flex flex-col justify-between" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="flex flex-col items-center justify-center w-full h-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-xl">กำลังโหลดหนังสือ...</div>
            </div>
          ) : error || !bookUrl ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-xl text-red-500">{error || 'No book URL provided'}</div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full overflow-auto pb-4">
              <Document
                file={bookUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={(err) => {
                  console.error('[ReaderPage] onLoadError:', err);
                  setError('Error loading PDF');
                }}
                onSourceError={(err) => {
                  console.error('[ReaderPage] onSourceError:', err);
                  setError('Error loading PDF');
                }}
                className="flex flex-col items-center justify-center"
              >
                <div className="flex flex-row justify-center">
                  {singlePage ? (
                    <Page
                      pageNumber={page}
                      width={pageWidth}
                      className="shadow-lg"
                    />
                  ) : (
                    <>
                      <Page
                        pageNumber={page}
                        width={pageWidth}
                        className="shadow-lg mr-2"
                      />
                      {numPages && page + 1 <= numPages && (
                        <Page
                          pageNumber={page + 1}
                          width={pageWidth}
                          className="shadow-lg ml-2"
                        />
                      )}
                    </>
                  )}
                </div>
              </Document>
            </div>
          )}
        </div>

        {/* Navigation and Progress */}
        <div className="w-full mt-6">
          <div className="w-full h-1 bg-gray-200 rounded-full mb-4">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between w-full">
            <button
              onClick={goPrev}
              disabled={page <= 1}
              className="p-2 rounded bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
            >
              <FiChevronLeft />
            </button>
            <div className="text-sm text-gray-500">{currentPage} of {totalPages}</div>
            <button
              onClick={goNext}
              disabled={numPages ? page >= numPages - (singlePage ? 0 : 1) : true}
              className="p-2 rounded bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReaderPage;