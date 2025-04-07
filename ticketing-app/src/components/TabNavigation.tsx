import React from "react";

import { Tab } from "../types/tickets";

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
}: TabNavigationProps) {
  return (
    <div className="flex items-center border-b bg-neutral-50">
      <div className="flex flex-1 items-center space-x-1 overflow-x-auto overflow-y-visible px-2 no-scrollbar">
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
            className={`group relative flex h-9 cursor-pointer items-center rounded-t-lg px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? "bg-white border-l border-r border-t border-b-white -mb-px"
                : "hover:bg-neutral-100 text-neutral-600"
            } ${tab.isDragging ? "opacity-50" : ""}`}
          >
            {editingTab === tab.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={onEditingTitleChange}
                onKeyDown={onRenameKeyDown}
                className="w-full min-w-[80px] bg-transparent px-0 py-0 outline-none focus:ring-0 border-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{tab.title}</span>
            )}
            <button
              onClick={(e) => onCloseTabClick(tab.id, e)}
              className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 ${
                tabs.length > 1 ? "opacity-0 group-hover:opacity-100" : "hidden"
              }`}
            >
              ×
            </button>
          </div>
        ))}
        {/* Add new tab button inline with tabs */}
        <div
          onClick={onAddTabClick}
          className="flex h-9 cursor-pointer items-center px-3 border-l border-neutral-200 text-neutral-500 hover:bg-neutral-100"
          title="Add new tab"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default TabNavigation;
