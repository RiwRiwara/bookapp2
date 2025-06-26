import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.min.mjs';
import {
  FiChevronLeft,
  FiChevronRight,
  FiSettings,
  FiGrid,
  FiMaximize,
  FiMinimize,
  FiBookmark,
} from 'react-icons/fi';
import { IoMdArrowRoundBack } from 'react-icons/io';
import ReaderSettings from '../components/ReaderSettings';
import OverviewGrid from '../components/OverviewGrid';
import BookmarkSidebar from '../components/BookmarkSidebar';
import { bookService } from '../services';
import { Book } from '../services/bookService';
import './ReaderPage.css';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js';

interface ReaderPageProps {
  book: Book;
  onBack: () => void;
}

interface Bookmark {
  page: number;
  note: string;
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

const ReaderPage: React.FC<ReaderPageProps> = ({ book, onBack }) => {
  const [bookUrl, setBookUrl] = useState<string>('');
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(16);
  const [font, setFont] = useState<string>(fontOptions[0].value);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<string>(bgOptions[0].value);
  const [customBg, setCustomBg] = useState<string>('');
  const [singlePage, setSinglePage] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showOverview, setShowOverview] = useState<boolean>(false);
  const [showBookmarks, setShowBookmarks] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [zoom, setZoom] = useState<number>(1.5);
  const [thumbnails, setThumbnails] = useState<{ [key: number]: string }>({});
  const [showFloatingSettings, setShowFloatingSettings] =
    useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Bookmark handlers
  const jumpToBookmark = (targetPage: number) => {
    console.log('[ReaderPage] Jumping to bookmark. Target page:', targetPage);
    setPage(targetPage);
  };

  const removeBookmark = (targetPage: number) => {
    setBookmarks((bms) => bms.filter((bm) => bm.page !== targetPage));
  };

  const editBookmark = (targetPage: number, note: string) => {
    setBookmarks((bms) =>
      bms.map((bm) => (bm.page === targetPage ? { ...bm, note } : bm)),
    );
  };

  // Fullscreen toggle
  const handleFullscreen = () => {
    setIsFullscreen((f) => !f);
  };

  // Navigation
  const goPrev = () => {
    setPage((p) => Math.max(1, p - (singlePage ? 1 : 2)));
  };

  const goNext = () => {
    if (numPages) {
      setPage((p) =>
        Math.min(numPages - (singlePage ? 0 : 1), p + (singlePage ? 1 : 2)),
      );
    }
  };

  // Fetch book details
  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchBookDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await bookService.getBookDetails(book.bookId);
        if (response.success && response.data?.bookUrl) {
          const remoteUrl = response.data.bookUrl;
          try {
            const pdfRes = await fetch(remoteUrl);
            if (!pdfRes.ok) throw new Error('Failed to fetch PDF');
            const pdfBlob = await pdfRes.blob();
            objectUrl = URL.createObjectURL(pdfBlob);
            setBookUrl(objectUrl);
            const loadingTask = pdfjsLib.getDocument(objectUrl);
            const loadedPdf = await loadingTask.promise;
            setPdf(loadedPdf);
            setNumPages(loadedPdf.numPages);
          } catch (pdfErr) {
            console.error('Error fetching PDF blob:', pdfErr);
            setBookUrl(remoteUrl);
            const loadingTask = pdfjsLib.getDocument(remoteUrl);
            const loadedPdf = await loadingTask.promise;
            setPdf(loadedPdf);
            setNumPages(loadedPdf.numPages);
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

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [book.bookId]);

  // Render PDF pages
  useEffect(() => {
    if (!pdf || !canvasRef.current || showOverview) return;

    const renderPage = async () => {
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d')!;
      context.clearRect(0, 0, canvas.width, canvas.height);

      try {
        if (singlePage) {
          const pageObj = await pdf.getPage(page);
          const viewport = pageObj.getViewport({ scale: zoom });
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await pageObj.render({
            canvasContext: context,
            viewport,
          }).promise;
          console.log(
            `[ReaderPage] Rendered single page ${page} at zoom ${zoom}`,
          );
        } else {
          // Double-page mode: show two pages side by side
          let leftPageNum = page % 2 === 0 ? page : page - 1; // Ensure left page is even
          let rightPageNum = leftPageNum + 1;
          if (leftPageNum < 1) leftPageNum = 1;
          if (rightPageNum > pdf.numPages) rightPageNum = 0;

          const leftPage = await pdf.getPage(leftPageNum);
          const leftViewport = leftPage.getViewport({ scale: zoom });

          // Calculate canvas dimensions with a 10px gap between pages
          const pageGap = 10;
          const canvasHeight = leftViewport.height;
          const totalWidth =
            rightPageNum > 0
              ? leftViewport.width * 2 + pageGap
              : leftViewport.width;

          // Adjust canvas size to fit container width
          const containerWidth =
            containerRef.current?.clientWidth || window.innerWidth;
          const scaleFactor = Math.min(1, (containerWidth - 40) / totalWidth); // 40px for padding
          canvas.height = canvasHeight * scaleFactor;
          canvas.width = totalWidth * scaleFactor;

          // Render left page
          const scaledLeftViewport = leftPage.getViewport({
            scale: zoom * scaleFactor,
          });
          await leftPage.render({
            canvasContext: context,
            viewport: scaledLeftViewport,
            transform: [scaleFactor, 0, 0, scaleFactor, 0, 0],
          }).promise;

          // Render right page if available
          if (rightPageNum > 0 && rightPageNum <= pdf.numPages) {
            const rightPage = await pdf.getPage(rightPageNum);
            const scaledRightViewport = rightPage.getViewport({
              scale: zoom * scaleFactor,
            });
            await rightPage.render({
              canvasContext: context,
              viewport: scaledRightViewport,
              transform: [
                scaleFactor,
                0,
                0,
                scaleFactor,
                scaledLeftViewport.width + pageGap * scaleFactor,
                0,
              ],
            }).promise;
            console.log(
              `[ReaderPage] Rendered double page ${leftPageNum}-${rightPageNum} at zoom ${zoom}`,
            );
          } else {
            console.log(
              `[ReaderPage] Rendered single page ${leftPageNum} in double-page mode (no right page)`,
            );
          }
        }
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Error rendering PDF');
      }
    };

    renderPage();
  }, [pdf, page, zoom, singlePage, showOverview]);

  // Generate thumbnails for overview
  const generateThumbnails = async () => {
    if (!pdf || Object.keys(thumbnails).length >= pdf.numPages) return;

    const batchSize = 5;
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i += batchSize) {
      const pagePromises = [];

      for (let j = i; j < Math.min(i + batchSize, totalPages + 1); j++) {
        if (thumbnails[j]) continue;

        pagePromises.push(
          (async (pageNum: number) => {
            try {
              const page = await pdf.getPage(pageNum);
              const viewport = page.getViewport({ scale: 0.2 });

              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d')!;
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              await page.render({
                canvasContext: context,
                viewport,
              }).promise;

              setThumbnails((prev) => ({
                ...prev,
                [pageNum]: canvas.toDataURL(),
              }));
            } catch (error) {
              console.error(
                `Error generating thumbnail for page ${pageNum}:`,
                error,
              );
            }
          })(j),
        );
      }

      await Promise.all(pagePromises);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === '+') setZoom((z) => Math.min(z + 0.2, 3));
      else if (e.key === '-') setZoom((z) => Math.max(z - 0.2, 0.5));
      else if (e.key === 'g') {
        setShowOverview((prev) => !prev);
        if (!showOverview) generateThumbnails();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdf, showOverview]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setZoom(window.innerWidth < 768 ? 1 : 1.5);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Progress calculation
  const totalPages = numPages || 1;
  const currentPage = page;
  const progress = (currentPage / totalPages) * 100;
  const appliedBg = customBg || bgColor;
  const truncatedBookName =
    book.bookName.length > 60
      ? `${book.bookName.substring(0, 60)}...`
      : book.bookName;

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center reader-page"
        style={{
          background: appliedBg,
          transition: 'background 0.3s',
          fontFamily: font,
          fontSize: `${fontSize}px`,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xl">กำลังโหลดหนังสือ...</div>
          </div>
        ) : error || !bookUrl ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xl text-red-500">
              {error || 'No book URL provided'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center h-full w-full overflow-auto">
            <canvas ref={canvasRef} className="shadow-lg m-4" />
          </div>
        )}
        <button
          type="button"
          onClick={handleFullscreen}
          className="fixed top-6 right-6 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition z-50"
          title="Exit Fullscreen"
        >
          <FiMinimize size={28} />
        </button>
        <div
          className="fixed top-6 right-24 z-50"
          onMouseEnter={() => setShowFloatingSettings(true)}
          onMouseLeave={() => setShowFloatingSettings(false)}
          tabIndex={0}
          onFocus={() => setShowFloatingSettings(true)}
          onBlur={() => setShowFloatingSettings(false)}
        >
          <button
            type="button"
            className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition"
            title="Settings"
            style={{ outline: 'none' }}
          >
            <FiSettings size={24} />
          </button>
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
                zoom={zoom}
                setZoom={setZoom}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full p-0 m-0 reader-page"
      style={{
        background: appliedBg,
        transition: 'background 0.3s',
        fontFamily: font,
        fontSize: `${fontSize}px`,
      }}
      ref={containerRef}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-none p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-white text-2xl"
            onClick={onBack}
          >
            <IoMdArrowRoundBack />
          </button>
          <span className="text-white text-xl font-bold ml-2">
            {truncatedBookName}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => {
              setShowOverview(true);
              generateThumbnails();
            }}
            title="Overview"
            className="text-white"
          >
            <FiGrid size={22} />
          </button>
          <button
            type="button"
            onClick={() => setShowBookmarks(true)}
            title="Bookmarks"
            className="text-white"
          >
            <FiBookmark size={22} />
          </button>
          {/* <button
            type="button"
            onClick={handleFullscreen}
            title="Fullscreen"
            className="text-white"
          >
            {isFullscreen ? <FiMinimize size={22} /> : <FiMaximize size={22} />}
          </button> */}
          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            title="Settings"
            className="text-white"
          >
            <FiSettings size={22} />
          </button>
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
          zoom={zoom}
          setZoom={setZoom}
        />
      )}

      {/* Overview and Bookmarks */}
      {showOverview && (
        <OverviewGrid
          pages={Array.from(
            { length: numPages || 0 },
            (_, i) => `Page ${i + 1}`,
          )}
          thumbnails={thumbnails}
          bookmarks={bookmarks.map((bm) => bm.page)}
          searchTerm=""
          onJump={(idx: number) => {
            setPage(idx + 1);
            setShowOverview(false);
          }}
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
      <div
        className="p-8 flex flex-col justify-between"
        style={{ minHeight: 'calc(100vh - 200px)' }}
      >
        <div className="flex flex-col items-center justify-center w-full h-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-xl">กำลังโหลดหนังสือ...</div>
            </div>
          ) : error || !bookUrl ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-xl text-red-500">
                {error || 'No book URL provided'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full overflow-auto pb-4">
              <canvas ref={canvasRef} className="shadow-lg" />
            </div>
          )}
        </div>

        {/* Navigation and Progress */}
        <div className="w-full mt-6">
          <div className="w-full h-1 bg-gray-200 rounded-full mb-4">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={goPrev}
              disabled={page <= 1}
              className="p-2 rounded bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
            >
              <FiChevronLeft />
            </button>
            <div className="text-sm text-gray-500">
              {currentPage} of {totalPages}
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={
                numPages ? page >= numPages - (singlePage ? 0 : 1) : true
              }
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
