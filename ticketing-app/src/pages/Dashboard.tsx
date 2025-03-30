// Dashboard page component 
import { useEffect, useMemo, useRef, useState } from "react"
import { Layout, Layouts, Responsive, WidthProvider } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const ResponsiveGridLayout = WidthProvider(Responsive)

// Available widgets definition
const AVAILABLE_WIDGETS = [
  { id: "stats-1", title: "Total Tickets", type: "stat" },
  { id: "stats-2", title: "Open Tickets", type: "stat" },
  { id: "stats-3", title: "Closed Tickets", type: "stat" },
  { id: "stats-4", title: "Average Response Time", type: "stat" },
  { id: "activity", title: "Recent Activity", type: "activity" },
  { id: "chart", title: "Ticket Trends", type: "chart" },
  { id: "tasks", title: "Your Tasks", type: "tasks" },
]

// Default starter layout - empty
const DEFAULT_LAYOUTS: Layouts = {
  lg: [],
  md: [],
  sm: [],
}

// Example preset layout
const PRESET_LAYOUTS: Record<string, Layouts> = {
  "Standard": {
    lg: [
      { i: "stats-1", x: 0, y: 0, w: 3, h: 2 },
      { i: "stats-2", x: 3, y: 0, w: 3, h: 2 },
      { i: "stats-3", x: 6, y: 0, w: 3, h: 2 },
      { i: "stats-4", x: 9, y: 0, w: 3, h: 2 },
      { i: "activity", x: 0, y: 2, w: 6, h: 4 },
      { i: "chart", x: 6, y: 2, w: 6, h: 4 },
      { i: "tasks", x: 0, y: 6, w: 12, h: 3 },
    ],
    md: [
      { i: "stats-1", x: 0, y: 0, w: 3, h: 2 },
      { i: "stats-2", x: 3, y: 0, w: 3, h: 2 },
      { i: "stats-3", x: 0, y: 2, w: 3, h: 2 },
      { i: "stats-4", x: 3, y: 2, w: 3, h: 2 },
      { i: "activity", x: 0, y: 4, w: 6, h: 4 },
      { i: "chart", x: 0, y: 8, w: 6, h: 4 },
      { i: "tasks", x: 0, y: 12, w: 6, h: 4 },
    ],
    sm: [
      { i: "stats-1", x: 0, y: 0, w: 6, h: 2 },
      { i: "stats-2", x: 0, y: 2, w: 6, h: 2 },
      { i: "stats-3", x: 0, y: 4, w: 6, h: 2 },
      { i: "stats-4", x: 0, y: 6, w: 6, h: 2 },
      { i: "activity", x: 0, y: 8, w: 6, h: 4 },
      { i: "chart", x: 0, y: 12, w: 6, h: 4 },
      { i: "tasks", x: 0, y: 16, w: 6, h: 4 },
    ],
  },
  "Activity Focus": {
    lg: [
      { i: "activity", x: 0, y: 0, w: 12, h: 6 },
      { i: "stats-1", x: 0, y: 6, w: 3, h: 2 },
      { i: "stats-2", x: 3, y: 6, w: 3, h: 2 },
      { i: "stats-3", x: 6, y: 6, w: 3, h: 2 },
    ],
    md: [
      { i: "activity", x: 0, y: 0, w: 6, h: 6 },
      { i: "stats-1", x: 0, y: 6, w: 3, h: 2 },
      { i: "stats-2", x: 3, y: 6, w: 3, h: 2 },
      { i: "stats-3", x: 0, y: 8, w: 3, h: 2 },
    ],
    sm: [
      { i: "activity", x: 0, y: 0, w: 6, h: 6 },
      { i: "stats-1", x: 0, y: 6, w: 6, h: 2 },
      { i: "stats-2", x: 0, y: 8, w: 6, h: 2 },
      { i: "stats-3", x: 0, y: 10, w: 6, h: 2 },
    ],
  },
  "Analytics": {
    lg: [
      { i: "chart", x: 0, y: 0, w: 8, h: 6 },
      { i: "stats-1", x: 8, y: 0, w: 4, h: 2 },
      { i: "stats-2", x: 8, y: 2, w: 4, h: 2 },
      { i: "stats-3", x: 8, y: 4, w: 4, h: 2 },
    ],
    md: [
      { i: "chart", x: 0, y: 0, w: 6, h: 6 },
      { i: "stats-1", x: 0, y: 6, w: 3, h: 2 },
      { i: "stats-2", x: 3, y: 6, w: 3, h: 2 },
      { i: "stats-3", x: 0, y: 8, w: 3, h: 2 },
    ],
    sm: [
      { i: "chart", x: 0, y: 0, w: 6, h: 6 },
      { i: "stats-1", x: 0, y: 6, w: 6, h: 2 },
      { i: "stats-2", x: 0, y: 8, w: 6, h: 2 },
      { i: "stats-3", x: 0, y: 10, w: 6, h: 2 },
    ],
  },
}

interface ActiveWidget {
  id: string
  type: string
  title: string
}

function Dashboard() {
  // Modal state
  const [showAddWidget, setShowAddWidget] = useState(false)
  const [showPresetsMenu, setShowPresetsMenu] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [showSavePresetModal, setShowSavePresetModal] = useState(false)
  
  // Custom preset management
  const [presets, setPresets] = useState<Record<string, Layouts>>({})

  // Keep track of active widgets
  const [activeWidgets, setActiveWidgets] = useState<ActiveWidget[]>([])

  // Function to get saved data from localStorage
  const getSavedData = () => {
    if (typeof window === "undefined") return { layouts: null, widgets: [], presets: {} }
    
    const savedLayouts = localStorage.getItem("dashboard-layouts")
    const savedWidgets = localStorage.getItem("dashboard-widgets")
    const savedPresets = localStorage.getItem("dashboard-presets")
    
    return {
      layouts: savedLayouts ? JSON.parse(savedLayouts) : null,
      widgets: savedWidgets ? JSON.parse(savedWidgets) : [],
      presets: savedPresets ? JSON.parse(savedPresets) : {},
    }
  }

  // Initialize layouts, widgets and presets from localStorage or defaults
  const initialData = useMemo(() => {
    const { layouts, widgets, presets } = getSavedData()
    return {
      layouts: layouts || DEFAULT_LAYOUTS,
      widgets: widgets || [],
      presets: { ...PRESET_LAYOUTS, ...presets }
    }
  }, [])

  const [currentLayouts, setCurrentLayouts] = useState<Layouts>(initialData.layouts)
  const [layoutSaved, setLayoutSaved] = useState(false)

  // Load saved active widgets
  useEffect(() => {
    setActiveWidgets(initialData.widgets)
    setPresets(initialData.presets)
  }, [initialData.widgets, initialData.presets])

  // Handle layout changes
  const onLayoutChange = (layout: Layout[], layouts: Layouts) => {
    setCurrentLayouts(layouts)
    // Reset saved notification if the layout changes
    if (layoutSaved) setLayoutSaved(false)
  }

  // Save current layout to localStorage
  const saveLayout = () => {
    // Create a clean copy of the layouts and widgets for storage
    const layoutsToSave = JSON.parse(JSON.stringify(currentLayouts))
    
    // Ensure any widgets with missing layout entries get added
    activeWidgets.forEach(widget => {
      const breakpoints = Object.keys(layoutsToSave) as Array<keyof Layouts>
      
      breakpoints.forEach(breakpoint => {
        const hasWidget = layoutsToSave[breakpoint]?.some((item: Layout) => item.i === widget.id)
        
        if (!hasWidget && Array.isArray(layoutsToSave[breakpoint])) {
          // Get appropriate dimensions
          const { w, h } = (() => {
            switch (widget.type) {
              case 'stat': return { w: breakpoint === 'sm' ? 6 : 3, h: 2 }
              case 'activity': return { w: breakpoint === 'sm' ? 6 : 6, h: 4 }
              case 'chart': return { w: breakpoint === 'sm' ? 6 : 6, h: 4 }
              case 'tasks': return { w: breakpoint === 'sm' ? 6 : 6, h: 3 }
              default: return { w: breakpoint === 'sm' ? 6 : 4, h: 3 }
            }
          })()
          
          // Add missing widget with default positioning
          layoutsToSave[breakpoint].push({
            i: widget.id,
            x: 0,
            y: 9999, // Put at the bottom
            w,
            h,
            minW: 3,
            minH: 2
          })
        }
      })
    })
    
    localStorage.setItem("dashboard-layouts", JSON.stringify(layoutsToSave))
    localStorage.setItem("dashboard-widgets", JSON.stringify(activeWidgets))
    setLayoutSaved(true)
    // Reset saved notification after 3 seconds
    setTimeout(() => setLayoutSaved(false), 3000)
  }

  // Reset to default layout
  const resetLayout = () => {
    setCurrentLayouts(DEFAULT_LAYOUTS)
    setActiveWidgets([])
    localStorage.removeItem("dashboard-layouts")
    localStorage.removeItem("dashboard-widgets")
  }

  // Add a new widget to the dashboard
  const addWidget = (widgetId: string) => {
    const widgetToAdd = AVAILABLE_WIDGETS.find(w => w.id === widgetId)
    if (!widgetToAdd) return

    // Check if widget is already in active widgets
    if (activeWidgets.some(w => w.id === widgetId)) {
      setShowAddWidget(false)
      return
    }

    // Add widget to active widgets
    setActiveWidgets(prev => [...prev, widgetToAdd])

    // Add widget to layouts for each breakpoint
    const newLayouts: Layouts = JSON.parse(JSON.stringify(currentLayouts))
    
    // Set appropriate width and height based on widget type
    const getWidgetDimensions = (type: string) => {
      switch (type) {
        case 'stat':
          return { w: 3, h: 2 } // Stats are smaller
        case 'activity':
          return { w: 6, h: 4 } // Activity feed needs more vertical space
        case 'chart':
          return { w: 6, h: 4 } // Charts need more width
        case 'tasks':
          return { w: 6, h: 3 } // Task lists need more width
        default:
          return { w: 4, h: 3 } // Default size
      }
    }
    
    // Initialize layout arrays if they don't exist
    if (!newLayouts.lg) newLayouts.lg = []
    if (!newLayouts.md) newLayouts.md = []
    if (!newLayouts.sm) newLayouts.sm = []
    
    // Get the dimensions for this widget type
    const { w: lgWidth, h: lgHeight } = getWidgetDimensions(widgetToAdd.type)
    
    // Find the best position for the new widget
    const getNextPosition = (layouts: Layout[], cols: number) => {
      if (layouts.length === 0) return { x: 0, y: 0 }
      
      // Create a map of occupied positions
      let occupied = new Map<number, number>()
      
      // Fill in occupied positions from existing layouts
      layouts.forEach(layout => {
        for (let x = layout.x; x < layout.x + layout.w; x++) {
          const maxY = layout.y + layout.h
          if (!occupied.has(x) || occupied.get(x)! < maxY) {
            occupied.set(x, maxY)
          }
        }
      })
      
      // Find the first position where we can fit the widget
      let bestY = 0
      let bestX = 0
      let lowestPosition = Number.MAX_SAFE_INTEGER
      
      // Check each column as a potential starting point
      for (let startX = 0; startX <= cols - lgWidth; startX++) {
        // Find the highest Y value in the span of columns we would occupy
        let highestY = 0
        let canFit = true
        
        for (let x = startX; x < startX + lgWidth; x++) {
          const y = occupied.get(x) || 0
          highestY = Math.max(highestY, y)
          
          // If any column is too high, this position won't work
          if (highestY > lowestPosition) {
            canFit = false
            break
          }
        }
        
        if (canFit && highestY < lowestPosition) {
          lowestPosition = highestY
          bestX = startX
          bestY = highestY
        }
      }
      
      return { x: bestX, y: bestY }
    }
    
    // Get positions for each breakpoint, with appropriate column counts
    const lgPos = getNextPosition(newLayouts.lg, 12) // 12 columns in lg
    const mdPos = getNextPosition(newLayouts.md, 6)  // 6 columns in md
    const smPos = getNextPosition(newLayouts.sm, 6)  // 6 columns in sm
    
    // Add to large screens
    newLayouts.lg.push({ 
      i: widgetId, 
      x: lgPos.x, 
      y: lgPos.y, 
      w: lgWidth, 
      h: lgHeight,
      minW: 3, 
      minH: 2
    })
    
    // Add to medium screens
    newLayouts.md.push({ 
      i: widgetId, 
      x: mdPos.x, 
      y: mdPos.y, 
      w: Math.min(6, lgWidth), // Constrain to grid
      h: lgHeight,
      minW: 3,
      minH: 2
    })
    
    // Add to small screens - always use full width on small screens for better mobile experience
    newLayouts.sm.push({ 
      i: widgetId, 
      x: 0, // Always start at the beginning of the row
      y: smPos.y, 
      w: 6, // Full width (6 columns)
      h: lgHeight,
      minW: 3,
      minH: 2
    })

    setCurrentLayouts(newLayouts)
    setShowAddWidget(false)
  }

  // Remove a widget from the dashboard
  const removeWidget = (widgetId: string) => {
    // Remove from active widgets
    setActiveWidgets(prev => prev.filter(w => w.id !== widgetId))

    // Remove from layouts
    const newLayouts: Layouts = { ...currentLayouts }
    
    Object.keys(newLayouts).forEach(breakpoint => {
      newLayouts[breakpoint] = newLayouts[breakpoint].filter(
        item => item.i !== widgetId
      )
    })

    setCurrentLayouts(newLayouts)
  }

  // Save current layout as a preset
  const saveAsPreset = () => {
    if (!presetName.trim()) return

    const newPresets = {
      ...presets,
      [presetName]: currentLayouts
    }
    
    setPresets(newPresets)
    localStorage.setItem("dashboard-presets", JSON.stringify(newPresets))
    setPresetName("")
    setShowSavePresetModal(false)
  }

  // Load a preset layout
  const loadPreset = (presetKey: string) => {
    const presetToLoad = presets[presetKey]
    if (!presetToLoad) return

    // Determine which widgets are used in this preset
    const widgetIds = new Set<string>()
    Object.values(presetToLoad).forEach(layouts => {
      layouts.forEach(layout => widgetIds.add(layout.i))
    })

    // Map widget IDs to full widget objects
    const presetWidgets = Array.from(widgetIds)
      .map(id => AVAILABLE_WIDGETS.find(w => w.id === id))
      .filter(Boolean) as ActiveWidget[]

    setCurrentLayouts(presetToLoad)
    setActiveWidgets(presetWidgets)
    setShowPresetsMenu(false)
  }

  // Delete a preset
  const deletePreset = (presetKey: string) => {
    const newPresets = { ...presets }
    delete newPresets[presetKey]
    
    setPresets(newPresets)
    localStorage.setItem("dashboard-presets", JSON.stringify(newPresets))
  }

  // Render widget based on its type
  const renderWidget = (widget: ActiveWidget) => {
    switch (widget.type) {
      case 'stat':
        const statContent = {
          'stats-1': { value: '128', description: '12% increase from last month' },
          'stats-2': { value: '43', description: '5 new today' },
          'stats-3': { value: '85', description: '16 closed today' },
          'stats-4': { value: '4h 32m', description: '12% faster than last month' }
        }[widget.id]

        return (
          <div className="h-full w-full border rounded-lg bg-white">
            <div className="widget-drag-handle cursor-move py-2 px-4 text-sm font-medium text-neutral-700 border-b">
              {widget.title}
            </div>
            <div className="p-4">
              <p className="text-3xl font-bold">{statContent?.value || '0'}</p>
              <p className="mt-2 text-xs text-neutral-500">{statContent?.description || ''}</p>
            </div>
          </div>
        )
      case 'activity':
        return (
          <div className="h-full w-full border rounded-lg bg-white">
            <div className="widget-drag-handle cursor-move py-2 px-4 text-sm font-medium text-neutral-700 border-b">
              {widget.title}
            </div>
            <div className="p-4 h-[calc(100%-40px)] overflow-auto">
              <div className="space-y-4">
                <ActivityItem 
                  title="Ticket #1234 created" 
                  description="Support request from John Doe" 
                  timestamp="2 hours ago" 
                />
                <ActivityItem 
                  title="Ticket #1232 closed" 
                  description="Issue resolved by Sarah Smith" 
                  timestamp="4 hours ago" 
                />
                <ActivityItem 
                  title="New user joined" 
                  description="Michael Johnson joined the team" 
                  timestamp="Yesterday" 
                />
                <ActivityItem 
                  title="Ticket #1228 updated" 
                  description="Priority changed from Medium to High" 
                  timestamp="Yesterday" 
                />
              </div>
            </div>
          </div>
        )
      case 'chart':
        return (
          <div className="h-full w-full border rounded-lg bg-white">
            <div className="widget-drag-handle cursor-move py-2 px-4 text-sm font-medium text-neutral-700 border-b">
              {widget.title}
            </div>
            <div className="p-4 h-[calc(100%-40px)]">
              <BarChart />
            </div>
          </div>
        )
      case 'tasks':
        return (
          <div className="h-full w-full border rounded-lg bg-white">
            <div className="widget-drag-handle cursor-move py-2 px-4 text-sm font-medium text-neutral-700 border-b">
              {widget.title}
            </div>
            <div className="p-4 h-[calc(100%-40px)]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <TaskCard 
                  title="Review pending tickets" 
                  status="In Progress" 
                  dueDate="Today"
                />
                <TaskCard 
                  title="Update knowledge base" 
                  status="Not Started" 
                  dueDate="Tomorrow"
                />
                <TaskCard 
                  title="Team meeting" 
                  status="Completed" 
                  dueDate="Yesterday"
                />
              </div>
            </div>
          </div>
        )
      default:
        return <div>Unknown widget type</div>
    }
  }

  // Return component that wraps each widget with proper styling
  const renderWidgetContainer = (widget: ActiveWidget) => (
    <div className="relative h-full w-full">
      <button 
        onClick={() => removeWidget(widget.id)}
        className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
        title="Remove widget"
      >
        ×
      </button>
      {renderWidget(widget)}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-neutral-500">Welcome to your ticketing system dashboard</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <button 
              onClick={() => setShowPresetsMenu(prev => !prev)}
              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Presets
            </button>
            
            {showPresetsMenu && (
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-neutral-200 bg-white shadow-lg">
                <div className="p-2">
                  <div className="mb-2 border-b border-neutral-200 pb-1 pt-1 text-sm font-medium">
                    System Presets
                  </div>
                  {Object.keys(PRESET_LAYOUTS).map(preset => (
                    <button
                      key={preset}
                      onClick={() => loadPreset(preset)}
                      className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-neutral-100"
                    >
                      {preset}
                    </button>
                  ))}
                  
                  {Object.keys(presets).filter(key => !PRESET_LAYOUTS[key]).length > 0 && (
                    <div className="mb-2 mt-2 border-b border-neutral-200 pb-1 pt-1 text-sm font-medium">
                      Your Presets
                    </div>
                  )}
                  
                  {Object.keys(presets)
                    .filter(key => !PRESET_LAYOUTS[key])
                    .map(preset => (
                      <div 
                        key={preset} 
                        className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-neutral-100"
                      >
                        <button
                          onClick={() => loadPreset(preset)}
                          className="text-left"
                        >
                          {preset}
                        </button>
                        <button
                          onClick={() => deletePreset(preset)}
                          className="text-neutral-500 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                  ))}
                  
                  <div className="mt-2 border-t border-neutral-200 pt-2">
                    <button
                      onClick={() => {
                        setShowPresetsMenu(false)
                        setShowSavePresetModal(true)
                      }}
                      className="block w-full rounded-md px-3 py-1.5 text-left text-sm font-medium text-blue-500 hover:bg-neutral-100"
                    >
                      Save current as preset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setShowAddWidget(true)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Add Widget
          </button>
          
          <button 
            onClick={saveLayout}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            {layoutSaved ? "Layout Saved!" : "Save Layout"}
          </button>
          
          <button 
            onClick={resetLayout}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Reset Layout
          </button>
        </div>
      </div>
      
      <div className="text-sm text-neutral-500">
        <span>Drag and resize components to customize your dashboard</span>
      </div>
      
      {/* Modal for adding widgets */}
      {showAddWidget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Add Widget</h2>
              <button 
                onClick={() => setShowAddWidget(false)}
                className="text-2xl text-neutral-500 hover:text-neutral-800"
              >
                ×
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-auto">
              {AVAILABLE_WIDGETS.map(widget => {
                const isActive = activeWidgets.some(w => w.id === widget.id)
                return (
                  <button
                    key={widget.id}
                    onClick={() => addWidget(widget.id)}
                    disabled={isActive}
                    className={`mb-2 flex w-full items-center justify-between rounded-md border p-3 text-left ${
                      isActive 
                        ? 'cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-400' 
                        : 'border-neutral-200 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <span>{widget.title}</span>
                    {isActive && <span className="text-sm text-neutral-500">Already added</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal for saving preset */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Save as Preset</h2>
              <button 
                onClick={() => setShowSavePresetModal(false)}
                className="text-2xl text-neutral-500 hover:text-neutral-800"
              >
                ×
              </button>
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Preset Name
              </label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="mb-4 w-full rounded-md border border-neutral-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="My Custom Layout"
              />
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowSavePresetModal(false)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAsPreset}
                  disabled={!presetName.trim()}
                  className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                    presetName.trim() 
                      ? 'bg-blue-500 hover:bg-blue-600' 
                      : 'cursor-not-allowed bg-blue-300'
                  }`}
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style>
        {`
          .react-grid-layout {
            position: relative;
            transition: height 200ms ease;
            width: 100%;
          }
          .react-grid-item {
            transition: all 200ms ease;
            transition-property: left, top;
            background: #fff;
            box-sizing: border-box;
            border-radius: 0.5rem;
            display: flex;
            overflow: hidden;
          }
          .react-grid-item > * {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
          }
          .react-grid-item.cssTransforms {
            transition-property: transform;
          }
          .react-grid-item.resizing {
            z-index: 1;
            will-change: width, height;
          }
          .react-grid-item.react-draggable-dragging {
            transition: none;
            z-index: 3;
            will-change: transform;
          }
          .react-grid-item.react-grid-placeholder {
            background: rgba(0, 120, 240, 0.1);
            border: 2px dashed #0078f0;
            opacity: 0.7;
            transition-duration: 100ms;
            z-index: 2;
            border-radius: 0.5rem;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            -o-user-select: none;
            user-select: none;
          }
          .react-grid-item > .react-resizable-handle {
            position: absolute;
            width: 20px;
            height: 20px;
            bottom: 0;
            right: 0;
            cursor: se-resize;
          }
          .react-grid-item > .react-resizable-handle::after {
            content: "";
            position: absolute;
            right: 4px;
            bottom: 4px;
            width: 12px;
            height: 12px;
            border-right: 2px solid rgba(0, 0, 0, 0.3);
            border-bottom: 2px solid rgba(0, 0, 0, 0.3);
          }
        `}
      </style>
      
      {activeWidgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 p-12 text-center">
          <p className="mb-4 text-lg text-neutral-500">Your dashboard is empty</p>
          <button
            onClick={() => setShowAddWidget(true)}
            className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Add your first widget
          </button>
        </div>
      ) : (
        <div className="w-full">
          <ResponsiveGridLayout
            className="layout"
            layouts={currentLayouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 6, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={100}
            onLayoutChange={onLayoutChange}
            isDraggable
            isResizable
            margin={[20, 20]}
            containerPadding={[20, 20]}
            preventCollision={false}
            compactType="vertical"
            useCSSTransforms={true}
            draggableHandle=".widget-drag-handle"
            style={{ width: '100%' }}
          >
            {activeWidgets.map(widget => (
              <div key={widget.id}>
                {renderWidgetContainer(widget)}
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      )}
    </div>
  )
}

// Activity item component for recent activity section
interface ActivityItemProps {
  title: string
  description: string
  timestamp: string
}

function ActivityItem({ title, description, timestamp }: ActivityItemProps) {
  return (
    <div className="flex items-start space-x-4 rounded-md border border-transparent px-2 py-3 hover:bg-neutral-50">
      <div className="flex-1 space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
      <div className="text-sm text-neutral-500">{timestamp}</div>
    </div>
  )
}

// Task card component
interface TaskCardProps {
  title: string
  status: "Not Started" | "In Progress" | "Completed"
  dueDate: string
}

function TaskCard({ title, status, dueDate }: TaskCardProps) {
  const statusColor = {
    "Not Started": "bg-yellow-100 text-yellow-800",
    "In Progress": "bg-blue-100 text-blue-800",
    "Completed": "bg-green-100 text-green-800",
  }[status]

  return (
    <div className="rounded-lg border p-4 hover:bg-neutral-50">
      <h3 className="font-medium">{title}</h3>
      <div className="mt-2 flex items-center justify-between">
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}>
          {status}
        </span>
        <span className="text-xs text-neutral-500">Due: {dueDate}</span>
      </div>
    </div>
  )
}

// Simple bar chart component
function BarChart() {
  const data = [
    { label: "Mon", value: 10 },
    { label: "Tue", value: 15 },
    { label: "Wed", value: 8 },
    { label: "Thu", value: 12 },
    { label: "Fri", value: 20 },
    { label: "Sat", value: 5 },
    { label: "Sun", value: 3 },
  ]
  
  const maxValue = Math.max(...data.map(item => item.value))
  
  return (
    <div className="h-full w-full flex flex-col">
      <div className="h-full flex items-end space-x-1">
        {data.map((item, index) => (
          <div 
            key={index} 
            className="flex flex-1 flex-col items-center"
          >
            <div 
              className="w-full rounded-t bg-blue-500"
              style={{ 
                height: `${Math.max(15, (item.value / maxValue) * 100)}%`,
                minHeight: "10px"
              }}
            />
            <div className="mt-1 text-xs text-center">{item.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-center text-xs text-neutral-500">Daily Ticket Volume</div>
    </div>
  )
}

export default Dashboard 