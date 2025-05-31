import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

import useUserStore from "../stores/userStore";

// Define the Tab type directly in this file
type Tab = {
  id: string;
  title: string;
  content?: string;
  status?: string;
  isDragging?: boolean;
  appliedPreset?: string;
};

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  editingTab: string | null;
  editingTitle: string;
  onTabClick: (tabId: string) => void;
  onAddTabClick: () => void;
  onCloseTabClick: (tabId: string, e: React.MouseEvent) => void;
  onDoubleClick: (tabId: string) => void;
  onDragStart: (e: React.DragEvent, tabId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetTabId: string) => void;
  onEditingTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRenameKeyDown: (e: React.KeyboardEvent) => void;
  onRenameBlur: () => void;
  className?: string;
  showAddButton?: boolean;
  children?: React.ReactNode; // Optional children to render next to tabs
}

/**
 * Tab navigation component for the tickets view
 */
function TabNavigation({
  tabs,
  activeTab,
  editingTab,
  editingTitle,
  onTabClick,
  onAddTabClick,
  onCloseTabClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEditingTitleChange,
  onRenameKeyDown,
  onRenameBlur,
  className,
  showAddButton = false,
  children,
}: TabNavigationProps) {
  const { currentUser } = useUserStore();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Check if scroll buttons should be shown
  useEffect(() => {
    const checkScroll = () => {
      if (tabsContainerRef.current) {
        const { scrollWidth, clientWidth } = tabsContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [tabs]);

  const scroll = (direction: "left" | "right") => {
    if (tabsContainerRef.current) {
      const { scrollLeft, clientWidth } = tabsContainerRef.current;
      const newPosition =
        direction === "left"
          ? scrollLeft - clientWidth / 2
          : scrollLeft + clientWidth / 2;
      tabsContainerRef.current.scrollTo({
        left: newPosition,
        behavior: "smooth",
      });
      setScrollPosition(newPosition);
    }
  };

  return (
    <div className={cn("flex items-center border-b bg-secondary", className)}>
      {showScrollButtons && (
        <button
          onClick={() => scroll("left")}
          className="flex-shrink-0 px-2 h-9 focus:outline-none"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      <div
        ref={tabsContainerRef}
        className="flex-1 overflow-x-auto no-scrollbar flex items-center"
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            draggable={editingTab !== tab.id}
            onDragStart={(e) => onDragStart(e, tab.id)}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, tab.id)}
            onClick={() => onTabClick(tab.id)}
            onDoubleClick={() => onDoubleClick(tab.id)}
            className={cn(
              "h-9 min-w-[120px] px-3 transition-colors relative whitespace-nowrap flex items-center justify-between",
              tab.id === activeTab
                ? "bg-card border-l border-r border-t border-b-card -mb-px"
                : "hover:bg-accent text-muted-foreground"
            )}
          >
            {editingTab === tab.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={onEditingTitleChange}
                onKeyDown={onRenameKeyDown}
                onBlur={onRenameBlur}
                className="w-full min-w-[80px] bg-transparent px-0 py-0 outline-none focus:ring-0 border-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate max-w-[85%]">{tab.title}</span>
            )}
            {onCloseTabClick && tab.id !== "general" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTabClick(tab.id, e);
                }}
                className={`ml-1.5 flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground ${
                  tab.id === activeTab ? "bg-card" : ""
                }`}
                aria-label={`Remove ${tab.title} tab`}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        {showAddButton && onAddTabClick && currentUser?.role === "admin" && (
          <button
            onClick={onAddTabClick}
            className="flex h-9 cursor-pointer items-center px-3 border-l border-border text-muted-foreground hover:bg-accent"
            aria-label="Add new tab"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {showScrollButtons && (
        <button
          onClick={() => scroll("right")}
          className="flex-shrink-0 px-2 h-9 focus:outline-none"
          aria-label="Scroll tabs right"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {children && <div className="ml-auto">{children}</div>}
    </div>
  );
}

export default TabNavigation;
