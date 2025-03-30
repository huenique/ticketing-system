// Dashboard page component 
import { useEffect, useMemo, useState } from "react"
import { Layout, Layouts, Responsive, WidthProvider } from "react-grid-layout"
import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"

const ResponsiveGridLayout = WidthProvider(Responsive)

// Default layouts for different breakpoints
const DEFAULT_LAYOUTS: Layouts = {
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
}

function Dashboard() {
  // Try to load saved layouts from localStorage
  const getSavedLayouts = (): Layouts | null => {
    if (typeof window === "undefined") return null
    const savedLayouts = localStorage.getItem("dashboard-layouts")
    return savedLayouts ? JSON.parse(savedLayouts) : null
  }

  // Initialize layouts from either localStorage or defaults
  const initialLayouts = useMemo<Layouts>(() => {
    return getSavedLayouts() || DEFAULT_LAYOUTS
  }, [])

  const [currentLayouts, setCurrentLayouts] = useState<Layouts>(initialLayouts)
  const [layoutSaved, setLayoutSaved] = useState(false)

  // Handle layout changes
  const onLayoutChange = (layout: Layout[], layouts: Layouts) => {
    setCurrentLayouts(layouts)
    // Reset saved notification if the layout changes
    if (layoutSaved) setLayoutSaved(false)
  }

  // Save current layout to localStorage
  const saveLayout = () => {
    localStorage.setItem("dashboard-layouts", JSON.stringify(currentLayouts))
    setLayoutSaved(true)
    // Reset saved notification after 3 seconds
    setTimeout(() => setLayoutSaved(false), 3000)
  }

  // Reset to default layout
  const resetLayout = () => {
    setCurrentLayouts(DEFAULT_LAYOUTS)
    localStorage.removeItem("dashboard-layouts")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-neutral-500">Welcome to your ticketing system dashboard</p>
        </div>
        <div className="flex space-x-2">
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
      
      <ResponsiveGridLayout
        className="layout"
        layouts={currentLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 6, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        onLayoutChange={onLayoutChange}
        isDraggable
        isResizable
        margin={[16, 16]}
      >
        <div key="stats-1" className="shadow-sm">
          <DashboardCard 
            title="Total Tickets" 
            value="128" 
            description="12% increase from last month" 
          />
        </div>
        <div key="stats-2" className="shadow-sm">
          <DashboardCard 
            title="Open Tickets" 
            value="43" 
            description="5 new today" 
          />
        </div>
        <div key="stats-3" className="shadow-sm">
          <DashboardCard 
            title="Closed Tickets" 
            value="85" 
            description="16 closed today" 
          />
        </div>
        <div key="stats-4" className="shadow-sm">
          <DashboardCard 
            title="Average Response Time" 
            value="4h 32m" 
            description="12% faster than last month" 
          />
        </div>
        <div key="activity" className="shadow-sm">
          <div className="h-full rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
            <div className="space-y-4 overflow-auto" style={{ maxHeight: "calc(100% - 3rem)" }}>
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
        <div key="chart" className="shadow-sm">
          <div className="h-full rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">Ticket Trends</h2>
            <div className="flex h-[calc(100%-3rem)] items-center justify-center">
              <div className="h-full w-full">
                <BarChart />
              </div>
            </div>
          </div>
        </div>
        <div key="tasks" className="shadow-sm">
          <div className="h-full rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold">Your Tasks</h2>
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
      </ResponsiveGridLayout>
    </div>
  )
}

// Dashboard card component for displaying statistics
interface DashboardCardProps {
  title: string
  value: string
  description: string
}

function DashboardCard({ title, value, description }: DashboardCardProps) {
  return (
    <div className="h-full rounded-lg border bg-white p-6">
      <h3 className="text-sm font-medium text-neutral-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{description}</p>
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
    <div className="flex h-full w-full flex-col">
      <div className="flex h-full items-end space-x-2">
        {data.map((item, index) => (
          <div 
            key={index} 
            className="flex flex-1 flex-col items-center"
          >
            <div 
              className="w-full rounded-t bg-blue-500"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            />
            <div className="mt-2 text-xs">{item.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center text-sm text-neutral-500">Daily Ticket Volume (Last Week)</div>
    </div>
  )
}

export default Dashboard 