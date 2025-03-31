import { useState, useEffect } from "react"

// Define the Tab type
interface Tab {
  id: string
  title: string
  content: "all" | "new" | "awaiting-customer" | "awaiting-parts" | "open" | "in-progress" | "completed" | "declined"
  isDragging?: boolean
}

function Tickets() {
  // Function to get saved data from localStorage
  const getSavedTabsData = () => {
    if (typeof window === "undefined") return { tabs: null, activeTab: null }
    
    const savedTabs = localStorage.getItem("ticket-tabs")
    const savedActiveTab = localStorage.getItem("ticket-active-tab")
    
    return {
      tabs: savedTabs ? JSON.parse(savedTabs) : null,
      activeTab: savedActiveTab || null,
    }
  }

  // Initialize tabs from localStorage or defaults
  const initialData = (() => {
    const { tabs, activeTab } = getSavedTabsData()
    return {
      tabs: tabs || [{ id: "tab-1", title: "All Tickets", content: "all" }],
      activeTab: activeTab || "tab-1"
    }
  })()

  // State for tabs and active tab
  const [tabs, setTabs] = useState<Tab[]>(initialData.tabs)
  const [activeTab, setActiveTab] = useState(initialData.activeTab)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedTab, setDraggedTab] = useState<string | null>(null)
  const [editingTab, setEditingTab] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [tabsSaved, setTabsSaved] = useState(false)

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("ticket-tabs", JSON.stringify(tabs))
  }, [tabs])

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("ticket-active-tab", activeTab)
  }, [activeTab])

  // Manual save function with confirmation
  const saveTabs = () => {
    localStorage.setItem("ticket-tabs", JSON.stringify(tabs))
    localStorage.setItem("ticket-active-tab", activeTab)
    setTabsSaved(true)
    // Reset notification after 3 seconds
    setTimeout(() => setTabsSaved(false), 3000)
  }

  // Reset to default tabs
  const resetTabs = () => {
    const defaultTabs: Tab[] = [{ id: "tab-1", title: "All Tickets", content: "all" }]
    setTabs(defaultTabs)
    setActiveTab("tab-1")
    localStorage.setItem("ticket-tabs", JSON.stringify(defaultTabs))
    localStorage.setItem("ticket-active-tab", "tab-1")
  }

  // Handle tab dragging
  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setIsDragging(true)
    setDraggedTab(tabId)
    e.dataTransfer.setData("text/plain", tabId)
    
    // Using setTimeout to allow the drag effect to show before applying styles
    setTimeout(() => {
      setTabs(prev => 
        prev.map(tab => tab.id === tabId 
          ? { ...tab, isDragging: true } 
          : tab
        )
      )
    }, 0)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDraggedTab(null)
    setTabs(prev => prev.map(tab => ({ ...tab, isDragging: false })))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()
    if (!draggedTab || draggedTab === targetTabId) return

    const draggedTabIndex = tabs.findIndex(tab => tab.id === draggedTab)
    const targetTabIndex = tabs.findIndex(tab => tab.id === targetTabId)
    
    // Reorder tabs
    const newTabs = [...tabs]
    const [draggedTabItem] = newTabs.splice(draggedTabIndex, 1)
    newTabs.splice(targetTabIndex, 0, draggedTabItem)
    
    setTabs(newTabs)
    setIsDragging(false)
    setDraggedTab(null)
  }

  // Add a new tab
  const addTab = () => {
    const newTabId = `tab-${tabs.length + 1}`
    const newTab: Tab = {
      id: newTabId,
      title: `Tickets ${tabs.length + 1}`,
      content: "all"
    }
    setTabs([...tabs, newTab])
    setActiveTab(newTabId)
  }

  // Close a tab
  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (tabs.length === 1) return // Don't close the last tab
    
    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)
    
    // If we're closing the active tab, activate another tab
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id)
    }
  }

  // Change tab content type
  const changeTabContent = (tabId: string, content: Tab["content"]) => {
    setTabs(prev => 
      prev.map(tab => tab.id === tabId 
        ? { ...tab, content } 
        : tab
      )
    )
  }

  // Handle double click to rename tab
  const handleDoubleClick = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return
    
    setEditingTab(tabId)
    setEditingTitle(tab.title)
  }
  
  // Save the new tab name
  const saveTabName = () => {
    if (!editingTab) return
    
    // Don't save empty titles
    if (editingTitle.trim() === "") {
      cancelTabRename()
      return
    }
    
    setTabs(prev => 
      prev.map(tab => tab.id === editingTab 
        ? { ...tab, title: editingTitle.trim() } 
        : tab
      )
    )
    setEditingTab(null)
    setEditingTitle("")
  }
  
  // Cancel the renaming
  const cancelTabRename = () => {
    setEditingTab(null)
    setEditingTitle("")
  }
  
  // Handle key press in input field
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      saveTabName()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelTabRename()
    }
  }

  // Render the content based on active tab
  const renderTabContent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab)
    if (!activeTabData) return null

    return (
      <div className="p-4">
        <div className="mb-4 flex justify-between">
          <div className="flex space-x-2">
            <select 
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm"
              value={activeTabData.content}
              onChange={(e) => changeTabContent(activeTab, e.target.value as Tab["content"])}
            >
              <option value="all">All Tickets</option>
              <option value="new">New Tickets</option>
              <option value="awaiting-customer">Awaiting Customer Response</option>
              <option value="awaiting-parts">Awaiting for Parts</option>
              <option value="open">Open Tickets</option>
              <option value="in-progress">In-Progress Tickets</option>
              <option value="completed">Completed Tickets</option>
              <option value="declined">Declined Tickets</option>
            </select>
            
            <input 
              type="text" 
              placeholder="Search tickets..." 
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm"
            />
          </div>
          
          <button className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600">
            New Ticket
          </button>
        </div>
        
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 text-sm text-neutral-600">
              <tr>
                <th className="border-b px-4 py-2 text-left font-medium">Ticket ID</th>
                <th className="border-b px-4 py-2 text-left font-medium">Date Created</th>
                <th className="border-b px-4 py-2 text-left font-medium">Customer Name</th>
                <th className="border-b px-4 py-2 text-left font-medium">Work Description</th>
                <th className="border-b px-4 py-2 text-left font-medium">Assign To</th>
                <th className="border-b px-4 py-2 text-left font-medium">Parts Used</th>
                <th className="border-b px-4 py-2 text-left font-medium">Status</th>
                <th className="border-b px-4 py-2 text-left font-medium">Total Hours</th>
                <th className="border-b px-4 py-2 text-left font-medium">Billable Hours</th>
                <th className="border-b px-4 py-2 text-left font-medium">Last Modified</th>
                <th className="border-b px-4 py-2 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {renderTickets(activeTabData.content)}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Generate different ticket data based on tab content type
  const renderTickets = (contentType: Tab["content"]) => {
    // This would normally come from an API
    let tickets = []
    
    // Status badges styling
    const statusStyles = {
      "new": "bg-blue-100 text-blue-800",
      "awaiting-customer": "bg-purple-100 text-purple-800",
      "awaiting-parts": "bg-yellow-100 text-yellow-800",
      "open": "bg-cyan-100 text-cyan-800",
      "in-progress": "bg-indigo-100 text-indigo-800",
      "completed": "bg-green-100 text-green-800",
      "declined": "bg-red-100 text-red-800"
    }
    
    // Map status types to display text
    const statusText = {
      "new": "New",
      "awaiting-customer": "Awaiting Customer",
      "awaiting-parts": "Awaiting Parts",
      "open": "Open",
      "in-progress": "In Progress",
      "completed": "Completed",
      "declined": "Declined"
    }
    
    // Common tickets that show in multiple views
    const commonTickets = [
      {
        id: "TK-1001",
        dateCreated: "2023-06-10",
        customerName: "John Smith",
        workDescription: "Repair broken laptop screen",
        assignTo: "Mike Johnson",
        partsUsed: "LCD Panel, Screws",
        status: "in-progress",
        totalHours: 3.5,
        billableHours: 2.5,
        lastModified: "2023-06-12"
      },
      {
        id: "TK-1002",
        dateCreated: "2023-06-11",
        customerName: "Sarah Williams",
        workDescription: "Setup new server and migrate data",
        assignTo: "Alex Thompson",
        partsUsed: "None",
        status: "awaiting-customer",
        totalHours: 5.0,
        billableHours: 5.0,
        lastModified: "2023-06-12"
      },
      {
        id: "TK-1003",
        dateCreated: "2023-06-09",
        customerName: "Robert Johnson",
        workDescription: "Install new software and update drivers",
        assignTo: "Emily Davis",
        partsUsed: "None",
        status: "completed",
        totalHours: 2.0,
        billableHours: 1.5,
        lastModified: "2023-06-10"
      },
      {
        id: "TK-1004",
        dateCreated: "2023-06-08",
        customerName: "Lisa Anderson",
        workDescription: "Replace network switch and reconfigure",
        assignTo: "Mike Johnson",
        partsUsed: "48-port Switch, Cat6 Cables",
        status: "awaiting-parts",
        totalHours: 0.5,
        billableHours: 0.5,
        lastModified: "2023-06-09"
      },
      {
        id: "TK-1005",
        dateCreated: "2023-06-07",
        customerName: "James Wilson",
        workDescription: "Computer won't boot, possible hardware failure",
        assignTo: "Alex Thompson",
        partsUsed: "Hard Drive",
        status: "new",
        totalHours: 0,
        billableHours: 0,
        lastModified: "2023-06-07"
      }
    ]
    
    const filteredTickets = contentType === "all" 
      ? commonTickets 
      : commonTickets.filter(ticket => ticket.status === contentType)
    
    tickets = filteredTickets.map(ticket => (
      <tr key={ticket.id} className="border-b hover:bg-neutral-50">
        <td className="px-4 py-3">{ticket.id}</td>
        <td className="px-4 py-3">{ticket.dateCreated}</td>
        <td className="px-4 py-3 font-medium">{ticket.customerName}</td>
        <td className="px-4 py-3 max-w-md truncate">{ticket.workDescription}</td>
        <td className="px-4 py-3">{ticket.assignTo}</td>
        <td className="px-4 py-3">{ticket.partsUsed}</td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[ticket.status as keyof typeof statusStyles]}`}>
            {statusText[ticket.status as keyof typeof statusText]}
          </span>
        </td>
        <td className="px-4 py-3">{ticket.totalHours}</td>
        <td className="px-4 py-3">{ticket.billableHours}</td>
        <td className="px-4 py-3 text-neutral-500">{ticket.lastModified}</td>
        <td className="px-4 py-3">
          <div className="flex space-x-2">
            <button className="rounded bg-neutral-100 p-1 text-neutral-700 hover:bg-neutral-200" title="View">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button className="rounded bg-blue-100 p-1 text-blue-700 hover:bg-blue-200" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    ))
    
    return tickets.length > 0 ? tickets : (
      <tr>
        <td colSpan={11} className="px-4 py-8 text-center text-neutral-500">
          No tickets found
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-neutral-500">Manage your support tickets</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={saveTabs}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            {tabsSaved ? "✓ Tabs Saved!" : "Save Tabs"}
          </button>
          
          <button 
            onClick={resetTabs}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Reset Tabs
          </button>
        </div>
      </div>
      
      <div className="rounded-lg border bg-white shadow-sm">
        {/* Tab bar */}
        <div className="flex items-center border-b bg-neutral-50">
          <div className="flex flex-1 items-center space-x-1 overflow-x-auto px-2">
            {tabs.map(tab => (
              <div
                key={tab.id}
                draggable={editingTab !== tab.id}
                onDragStart={(e) => handleDragStart(e, tab.id)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tab.id)}
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={() => handleDoubleClick(tab.id)}
                className={`group relative flex h-9 cursor-pointer items-center rounded-t-lg px-4 py-2 text-sm font-medium ${
                  activeTab === tab.id 
                    ? 'bg-white border-l border-r border-t border-b-white -mb-px' 
                    : 'hover:bg-neutral-100 text-neutral-600'
                } ${tab.isDragging ? 'opacity-50' : ''}`}
              >
                {editingTab === tab.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={saveTabName}
                    onKeyDown={handleRenameKeyDown}
                    className="w-full min-w-[80px] bg-transparent px-0 py-0 outline-none focus:ring-0 border-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span>{tab.title}</span>
                )}
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className={`ml-2 flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 ${
                    tabs.length > 1 ? 'opacity-0 group-hover:opacity-100' : 'hidden'
                  }`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="border-l px-2">
            <button
              onClick={addTab}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-neutral-200"
              title="Add new tab"
            >
              +
            </button>
          </div>
        </div>
        
        {/* Tab content */}
        {renderTabContent()}
      </div>
    </div>
  )
}

export default Tickets 