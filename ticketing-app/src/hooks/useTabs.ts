import { useState } from "react";

import { Tables } from "@/types/tables";
import { Tab } from "@/types/tickets";
import { statusesService } from "@/services/ticketsService";

/**
 * Custom hook to manage tab operations
 */
export function useTabs(initialTabs: Tab[], initialActiveTab: string) {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Handle tab dragging
  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setIsDragging(true);
    setDraggedTab(tabId);
    e.dataTransfer.setData("text/plain", tabId);

    // Using setTimeout to allow the drag effect to show before applying styles
    setTimeout(() => {
      setTabs((prev) =>
        prev.map((tab) => (tab.id === tabId ? { ...tab, isDragging: true } : tab)),
      );
    }, 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedTab(null);
    setTabs((prev) => prev.map((tab) => ({ ...tab, isDragging: false })));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetTabId) return;

    const draggedTabIndex = tabs.findIndex((tab) => tab.id === draggedTab);
    const targetTabIndex = tabs.findIndex((tab) => tab.id === targetTabId);

    // Reorder tabs
    const newTabs = [...tabs];
    const [draggedTabItem] = newTabs.splice(draggedTabIndex, 1);
    newTabs.splice(targetTabIndex, 0, draggedTabItem);

    setTabs(newTabs);
    setIsDragging(false);
    setDraggedTab(null);
  };

  // Add a new tab
  const addTab = async () => {
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
      
      setTabs([...tabs, newTab]);
      setActiveTab(newTabId);
    } catch (error) {
      console.error("Error creating status in Appwrite:", error);
      // Create the tab locally even if API request fails
      const newTab: Tab = {
        id: newTabId,
        title: newTabTitle,
        content: "all",
      };
      
      setTabs([...tabs, newTab]);
      setActiveTab(newTabId);
    }
  };

  // Close a tab
  const closeTab = (
    tabId: string,
    e: React.MouseEvent,
    tables: Tables,
    setTables: (tables: Tables) => void,
  ) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Don't close the last tab

    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);

    // If we're closing the active tab, activate another tab
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id);
    }

    // Remove the table data for this tab
    const newTables = { ...tables };
    delete newTables[tabId];
    setTables(newTables);
  };

  // Handle double click to rename tab
  const handleDoubleClick = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    setEditingTab(tabId);
    setEditingTitle(tab.title);
  };

  // Save the new tab name
  const saveTabName = async () => {
    if (!editingTab) return;

    // Don't save empty titles
    if (editingTitle.trim() === "") {
      cancelTabRename();
      return;
    }

    // Get the tab being edited
    const tabBeingEdited = tabs.find((tab) => tab.id === editingTab);
    if (!tabBeingEdited) {
      cancelTabRename();
      return;
    }
    
    // Update the tab locally
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === editingTab ? { ...tab, title: editingTitle.trim(), status: editingTitle.trim() } : tab,
      ),
    );
    
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
    
    // Clear editing state
    setEditingTab(null);
    setEditingTitle("");
  };

  // Cancel the renaming
  const cancelTabRename = () => {
    setEditingTab(null);
    setEditingTitle("");
  };

  // Handle key press in input field
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTabName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelTabRename();
    }
  };

  return {
    tabs,
    setTabs,
    activeTab,
    setActiveTab,
    isDragging,
    setIsDragging,
    draggedTab,
    setDraggedTab,
    editingTab,
    setEditingTab,
    editingTitle,
    setEditingTitle,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    addTab,
    closeTab,
    handleDoubleClick,
    saveTabName,
    cancelTabRename,
    handleRenameKeyDown,
  };
}
