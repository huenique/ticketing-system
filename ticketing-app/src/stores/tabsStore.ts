import { create } from "zustand";

import { Tab } from "@/types/tickets";
import { statusesService } from "@/services/ticketsService";

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
  addTab: () => Promise<void>;
  closeTab: (tabId: string, e: React.MouseEvent) => void;
  handleDoubleClick: (tabId: string) => void;
  saveTabName: () => Promise<void>;
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

      addTab: async () => {
        const { tabs } = get();
        const newTabTitle = `Tickets ${tabs.length + 1}`;
        const newTabId = `tab-${tabs.length + 1}`;
        
        // Create a new status in Appwrite
        try {
          // Create status in Appwrite first
          await statusesService.createStatus({ label: newTabTitle });
          console.log(`Created new status "${newTabTitle}" in Appwrite`);
          
          // Add the tab locally after successful API request
          const newTab: Tab = {
            id: newTabId,
            title: newTabTitle,
            content: "all",
            status: newTabTitle, // Link the tab to the status
          };
          
          set({
            tabs: [...tabs, newTab],
            activeTab: newTabId,
          });
        } catch (error) {
          console.error("Error creating status in Appwrite:", error);
          // Create the tab locally even if API request fails
          const newTab: Tab = {
            id: newTabId,
            title: newTabTitle,
            content: "all",
          };
          
          set({
            tabs: [...tabs, newTab],
            activeTab: newTabId,
          });
        }
      },

      closeTab: (tabId, e) => {
        e.stopPropagation();
        const { tabs, activeTab } = get();
        if (tabs.length === 1) return; // Don't close the last tab

        // Get the tab that is being closed
        const tabToClose = tabs.find(tab => tab.id === tabId);
        
        // Remove the tab from the UI
        const newTabs = tabs.filter((tab) => tab.id !== tabId);
        set({ tabs: newTabs });

        // If we're closing the active tab, activate another tab
        if (activeTab === tabId) {
          set({ activeTab: newTabs[0].id });
        }
        
        // If the tab has an associated status, delete it from the database
        if (tabToClose && tabToClose.status) {
          // Delete the status from Appwrite in the background
          (async () => {
            try {
              // Find the status in Appwrite that matches the tab's title
              const statuses = await statusesService.getAllStatuses();
              const statusToDelete = statuses.find(status => status.label === tabToClose.title);
              
              // If we found a matching status, delete it
              if (statusToDelete && statusToDelete.$id) {
                await statusesService.deleteStatus(statusToDelete.$id);
                console.log(`Deleted status "${tabToClose.title}" with ID ${statusToDelete.$id} from Appwrite`);
              }
            } catch (error) {
              console.error(`Error deleting status "${tabToClose.title}" from Appwrite:`, error);
            }
          })();
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

      saveTabName: async () => {
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

        // Get the tab being edited
        const tabBeingEdited = tabs.find((tab) => tab.id === editingTab);
        if (!tabBeingEdited) {
          set({
            editingTab: null,
            editingTitle: "",
          });
          return;
        }
        
        // Update the tab locally
        set({
          tabs: tabs.map((tab) =>
            tab.id === editingTab ? { ...tab, title: editingTitle.trim(), status: editingTitle.trim() } : tab,
          ),
          editingTab: null,
          editingTitle: "",
        });
        
        // Update the corresponding status in Appwrite if this tab is linked to a status
        if (tabBeingEdited.status) {
          try {
            // Find the status in Appwrite that matches the old tab name
            const statuses = await statusesService.getAllStatuses();
            const statusToUpdate = statuses.find(status => status.label === tabBeingEdited.title);
            
            // If we found a matching status, update it
            if (statusToUpdate && statusToUpdate.$id) {
              await statusesService.updateStatus(statusToUpdate.$id, { 
                label: editingTitle.trim() 
              });
              console.log(`Updated status from "${tabBeingEdited.title}" to "${editingTitle.trim()}" in Appwrite`);
            }
          } catch (error) {
            console.error("Error updating status in Appwrite:", error);
          }
        }
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
