import { create } from "zustand";

import { Tab } from "@/types/tickets";

import { persist } from "./middleware";

interface TabsState {
  tabs: Tab[];
  activeTab: string;
  isDragging: boolean;
  draggedTab: string | null;
  editingTab: string | null;
  editingTitle: string;

  // Actions
  setTabs: (tabs: Tab[]) => void;
  setActiveTab: (tabId: string) => void;
  setIsDragging: (isDragging: boolean) => void;
  setDraggedTab: (tabId: string | null) => void;
  setEditingTab: (tabId: string | null) => void;
  setEditingTitle: (title: string) => void;
  handleDragStart: (e: React.DragEvent, tabId: string) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetTabId: string) => void;
  addTab: () => void;
  closeTab: (tabId: string, e: React.MouseEvent) => void;
  handleDoubleClick: (tabId: string) => void;
  saveTabName: () => void;
  cancelTabRename: () => void;
  handleRenameKeyDown: (e: React.KeyboardEvent) => void;
}

const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      // Default initial state
      tabs: [{ id: "tab-1", title: "All Tickets", content: "all" }],
      activeTab: "tab-1",
      isDragging: false,
      draggedTab: null,
      editingTab: null,
      editingTitle: "",

      // Actions
      setTabs: (tabs) => set({ tabs }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setIsDragging: (isDragging) => set({ isDragging }),
      setDraggedTab: (draggedTab) => set({ draggedTab }),
      setEditingTab: (editingTab) => set({ editingTab }),
      setEditingTitle: (editingTitle) => set({ editingTitle }),

      handleDragStart: (e, tabId) => {
        set({ isDragging: true, draggedTab: tabId });
        e.dataTransfer.setData("text/plain", tabId);

        // Using setTimeout to allow the drag effect to show before applying styles
        setTimeout(() => {
          const { tabs } = get();
          set({
            tabs: tabs.map((tab) =>
              tab.id === tabId ? { ...tab, isDragging: true } : tab,
            ),
          });
        }, 0);
      },

      handleDragEnd: () => {
        const { tabs } = get();
        set({
          isDragging: false,
          draggedTab: null,
          tabs: tabs.map((tab) => ({ ...tab, isDragging: false })),
        });
      },

      handleDragOver: (e) => {
        e.preventDefault();
      },

      handleDrop: (e, targetTabId) => {
        e.preventDefault();
        const { tabs, draggedTab } = get();

        if (!draggedTab || draggedTab === targetTabId) return;

        const draggedTabIndex = tabs.findIndex((tab) => tab.id === draggedTab);
        const targetTabIndex = tabs.findIndex((tab) => tab.id === targetTabId);

        // Reorder tabs
        const newTabs = [...tabs];
        const [draggedTabItem] = newTabs.splice(draggedTabIndex, 1);
        newTabs.splice(targetTabIndex, 0, draggedTabItem);

        set({
          tabs: newTabs,
          isDragging: false,
          draggedTab: null,
        });
      },

      addTab: () => {
        const { tabs } = get();
        const newTabId = `tab-${tabs.length + 1}`;
        const newTab: Tab = {
          id: newTabId,
          title: `Tickets ${tabs.length + 1}`,
          content: "all",
        };
        set({
          tabs: [...tabs, newTab],
          activeTab: newTabId,
        });
      },

      closeTab: (tabId, e) => {
        e.stopPropagation();
        const { tabs, activeTab } = get();
        if (tabs.length === 1) return; // Don't close the last tab

        const newTabs = tabs.filter((tab) => tab.id !== tabId);
        set({ tabs: newTabs });

        // If we're closing the active tab, activate another tab
        if (activeTab === tabId) {
          set({ activeTab: newTabs[0].id });
        }
      },

      handleDoubleClick: (tabId) => {
        const { tabs } = get();
        const tab = tabs.find((t) => t.id === tabId);
        if (!tab) return;

        set({
          editingTab: tabId,
          editingTitle: tab.title,
        });
      },

      saveTabName: () => {
        const { editingTab, editingTitle, tabs } = get();
        if (!editingTab) return;

        // Don't save empty titles
        if (editingTitle.trim() === "") {
          set({
            editingTab: null,
            editingTitle: "",
          });
          return;
        }

        set({
          tabs: tabs.map((tab) =>
            tab.id === editingTab ? { ...tab, title: editingTitle.trim() } : tab,
          ),
          editingTab: null,
          editingTitle: "",
        });
      },

      cancelTabRename: () => {
        set({
          editingTab: null,
          editingTitle: "",
        });
      },

      handleRenameKeyDown: (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          get().saveTabName();
        } else if (e.key === "Escape") {
          e.preventDefault();
          get().cancelTabRename();
        }
      },
    }),
    {
      name: "ticket-tabs-storage",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTab: state.activeTab,
      }),
    },
  ),
);

export default useTabsStore;
