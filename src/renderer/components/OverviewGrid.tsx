import React from 'react';

interface OverviewGridProps {
  pages: string[];
  bookmarks: number[];
  searchTerm: string;
  onJump: (page: number) => void;
  onClose: () => void;
}

const OverviewGrid: React.FC<OverviewGridProps> = ({ pages, bookmarks, searchTerm, onJump, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-30 flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl w-[90vw] max-h-[80vh] overflow-auto relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-blue-600" onClick={onClose}>&times;</button>
        <div className="flex items-center mb-4 gap-2">
          <input type="text" value={searchTerm} readOnly className="border px-2 py-1 rounded w-64" placeholder="Search phrase..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pages.map((text, idx) => (
            <div key={idx} className={`border rounded p-2 text-xs h-32 overflow-y-auto cursor-pointer relative ${searchTerm && text.toLowerCase().includes(searchTerm.toLowerCase()) ? 'ring-2 ring-blue-400' : ''} ${bookmarks.includes(idx) ? 'bg-yellow-100' : ''}`} onClick={() => onJump(idx)}>
              <div className="absolute top-1 right-2 text-blue-400 text-xs">{idx + 1}</div>
              <div className="absolute top-1 left-2 text-yellow-400">{bookmarks.includes(idx) ? '★' : ''}</div>
              {searchTerm ? (
                <span dangerouslySetInnerHTML={{ __html: text.replace(new RegExp(`(${searchTerm})`, 'gi'), '<mark>$1</mark>') }} />
              ) : text.slice(0, 400)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewGrid;
