import { useState, useEffect, useCallback } from "react";

interface ContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  selectedText: string;
  sourceLanguage: string;
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isVisible: false,
    x: 0,
    y: 0,
    selectedText: "",
    sourceLanguage: "en-GB",
  });

  const showContextMenu = useCallback((event: React.MouseEvent, text: string, sourceLanguage: string = "en-GB") => {
    event.preventDefault();
    setContextMenu({
      isVisible: true,
      x: event.pageX,
      y: event.pageY,
      selectedText: text,
      sourceLanguage,
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  useEffect(() => {
    const handleClick = () => hideContextMenu();
    const handleScroll = () => hideContextMenu();

    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [hideContextMenu]);

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
}
