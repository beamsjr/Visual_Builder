import React, { useEffect } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onDelete,
  onDuplicate,
  onCopy,
}) => {
  useEffect(() => {
    const handleClick = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    onClose();
  };

  return (
    <div
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-1 z-50 min-w-[160px]"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
        onClick={(e) => handleMenuClick(e, onCopy)}
      >
        <span>📋</span>
        <span>Copy</span>
        <span className="ml-auto text-xs text-gray-400">Ctrl+C</span>
      </button>
      <button
        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center gap-2"
        onClick={(e) => handleMenuClick(e, onDuplicate)}
      >
        <span>📄</span>
        <span>Duplicate</span>
        <span className="ml-auto text-xs text-gray-400">Ctrl+D</span>
      </button>
      <div className="border-t border-gray-700 my-1"></div>
      <button
        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
        onClick={(e) => handleMenuClick(e, onDelete)}
      >
        <span>🗑️</span>
        <span>Delete</span>
        <span className="ml-auto text-xs text-gray-400">Del</span>
      </button>
    </div>
  );
};
