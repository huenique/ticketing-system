// Dashboard page component 
function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-neutral-500">Welcome to your ticketing system dashboard</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          title="Total Tickets" 
          value="128" 
          description="12% increase from last month" 
        />
        <DashboardCard 
          title="Open Tickets" 
          value="43" 
          description="5 new today" 
        />
        <DashboardCard 
          title="Closed Tickets" 
          value="85" 
          description="16 closed today" 
        />
        <DashboardCard 
          title="Average Response Time" 
          value="4h 32m" 
          description="12% faster than last month" 
        />
      </div>
      
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
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
        </div>
      </div>
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
    <div className="rounded-lg border bg-white p-6 shadow-sm">
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

export default Dashboard 