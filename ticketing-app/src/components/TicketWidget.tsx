import React from 'react'
import { Widget, TicketForm } from '../types/tickets'

interface TicketWidgetProps {
  widget: Widget
  ticketForm: TicketForm
  currentTicket?: Record<string, any> | null
  handleFieldChange: (fieldName: string, value: any) => void
  toggleWidgetCollapse: (widgetId: string) => void
  removeWidget: (widgetId: string) => void
  handleWidgetDragStart: (e: React.DragEvent, widgetId: string) => void
  handleWidgetDragEnd: () => void
  handleWidgetDragOver: (e: React.DragEvent) => void
  handleWidgetDrop: (e: React.DragEvent, targetWidgetId: string) => void
  
  // Additional props for specific widget types
  assignees?: any[]
  timeEntries?: any[]
  uploadedImages?: string[]
  handleAddAssignee?: () => void
  handleRemoveAssignee?: (id: string) => void
  handleUpdateAssignee?: (id: string, field: string, value: string) => void
  handleAddTimeEntry?: (assigneeId: string) => void
  handleRemoveTimeEntry?: (id: string) => void
  handleUpdateTimeEntry?: (id: string, field: string, value: string) => void
  setTicketForm?: (form: TicketForm) => void
  handleImageUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
  setUploadedImages?: (images: string[]) => void
  showAssigneeForm?: boolean
  setShowAssigneeForm?: (show: boolean) => void
  newAssignee?: any
  setNewAssignee?: (assignee: any) => void
}

/**
 * Widget component to render each draggable section of the ticket dialog
 */
function TicketWidget({
  widget,
  ticketForm,
  currentTicket,
  handleFieldChange,
  toggleWidgetCollapse,
  removeWidget,
  handleWidgetDragStart,
  handleWidgetDragEnd,
  handleWidgetDragOver,
  handleWidgetDrop,
  assignees = [],
  timeEntries = [],
  uploadedImages = [],
  handleAddAssignee,
  handleRemoveAssignee,
  handleUpdateAssignee,
  handleAddTimeEntry,
  handleRemoveTimeEntry,
  handleUpdateTimeEntry,
  setTicketForm,
  handleImageUpload,
  setUploadedImages,
  showAssigneeForm = false,
  setShowAssigneeForm,
  newAssignee,
  setNewAssignee
}: TicketWidgetProps) {
  
  const renderWidgetContent = () => {
    if (widget.isCollapsed) return null
    
    // First check if it's an individual field widget
    if (widget.fieldType) {
      switch (widget.fieldType) {
        case 'select':
          return (
            <div>
              <label htmlFor={widget.fieldName} className="block text-sm font-medium text-neutral-700">{widget.title}</label>
              <select
                id={widget.fieldName}
                value={ticketForm[widget.fieldName as keyof typeof ticketForm] || widget.fieldValue}
                onChange={(e) => handleFieldChange(widget.fieldName || '', e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="New">New</option>
                <option value="Awaiting Customer Response">Awaiting Customer Response</option>
                <option value="Awaiting Parts">Awaiting Parts</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
          )
          
        case 'text-readonly':
          return (
            <div>
              <label className="block text-sm font-medium text-neutral-700">{widget.title}</label>
              <div className="mt-1 py-2 px-3 bg-neutral-50 rounded-md border border-neutral-200">
                {widget.fieldValue}
              </div>
            </div>
          )
          
        case 'number':
          return (
            <div>
              <label htmlFor={widget.fieldName} className="block text-sm font-medium text-neutral-700">{widget.title}</label>
              <input
                type="number"
                id={widget.fieldName}
                value={ticketForm[widget.fieldName as keyof typeof ticketForm] || widget.fieldValue}
                onChange={(e) => handleFieldChange(widget.fieldName || '', e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                step="0.1"
                min="0"
              />
            </div>
          )
          
        case 'textarea':
          return (
            <div>
              <label htmlFor={widget.fieldName} className="block text-sm font-medium text-neutral-700">{widget.title}</label>
              <textarea
                id={widget.fieldName}
                value={ticketForm[widget.fieldName as keyof typeof ticketForm] || widget.fieldValue}
                onChange={(e) => handleFieldChange(widget.fieldName || '', e.target.value)}
                rows={5}
                className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>
          )
      }
    }
    
    // If not an individual field, fall back to the original widget types
    switch (widget.type) {
      case 'details':
        if (!setTicketForm) return null
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-neutral-700">Status</label>
                <select
                  id="status"
                  value={ticketForm.status}
                  onChange={(e) => setTicketForm({...ticketForm, status: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="New">New</option>
                  <option value="Awaiting Customer Response">Awaiting Customer Response</option>
                  <option value="Awaiting Parts">Awaiting Parts</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700">Customer Name</label>
                <div className="mt-1 py-2 px-3 bg-neutral-50 rounded-md border border-neutral-200">
                  {currentTicket?.cells['col-3']}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Date Created</label>
                  <div className="mt-1 py-2 px-3 bg-neutral-50 rounded-md border border-neutral-200">
                    {currentTicket?.cells['col-2']}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Last Modified</label>
                  <div className="mt-1 py-2 px-3 bg-neutral-50 rounded-md border border-neutral-200">
                    {currentTicket?.cells['col-10']}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="billableHours" className="block text-sm font-medium text-neutral-700">Billable Hours</label>
                  <input
                    type="number"
                    id="billableHours"
                    value={ticketForm.billableHours}
                    onChange={(e) => setTicketForm({...ticketForm, billableHours: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="totalHours" className="block text-sm font-medium text-neutral-700">Total Hours</label>
                  <input
                    type="number"
                    id="totalHours"
                    value={ticketForm.totalHours}
                    onChange={(e) => setTicketForm({...ticketForm, totalHours: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-neutral-700">General Ticket Description</label>
                <textarea
                  id="description"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                  rows={5}
                  className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )
      
      // Other widget types would follow...
      // For brevity, we'll add just one more example
      
      case 'assignees':
        if (!setShowAssigneeForm || !handleAddAssignee || !setNewAssignee || !newAssignee || 
            !handleUpdateAssignee || !handleRemoveAssignee || !handleAddTimeEntry) {
          return null
        }
        
        return (
          <div>
            {/* Form to add a new assignee */}
            {showAssigneeForm && (
              <div className="mb-4 p-4 border rounded-lg bg-neutral-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Name</label>
                    <input
                      type="text"
                      value={newAssignee.name}
                      onChange={(e) => setNewAssignee({...newAssignee, name: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Work Description</label>
                    <input
                      type="text"
                      value={newAssignee.workDescription}
                      onChange={(e) => setNewAssignee({...newAssignee, workDescription: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Total Hours</label>
                    <input
                      type="number"
                      value={newAssignee.totalHours}
                      onChange={(e) => setNewAssignee({...newAssignee, totalHours: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      step="0.1"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Estimated Time</label>
                    <input
                      type="number"
                      value={newAssignee.estTime}
                      onChange={(e) => setNewAssignee({...newAssignee, estTime: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      step="0.1"
                      min="0"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => setShowAssigneeForm(false)}
                    className="px-3 py-1.5 border border-neutral-300 rounded-md text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddAssignee}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex justify-between mb-3">
              <div></div>
              <button
                onClick={() => setShowAssigneeForm(true)}
                className="flex items-center rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
                title="Add assignee"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Team Member
              </button>
            </div>
            
            {/* Assignees table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Work Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Est. Time</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {assignees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-sm text-neutral-500">
                        No team members assigned yet
                      </td>
                    </tr>
                  )}
                  {assignees.map(assignee => (
                    <tr key={assignee.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="text"
                          value={assignee.name}
                          onChange={(e) => handleUpdateAssignee(assignee.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="text"
                          value={assignee.workDescription}
                          onChange={(e) => handleUpdateAssignee(assignee.id, 'workDescription', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="number"
                          value={assignee.totalHours}
                          onChange={(e) => handleUpdateAssignee(assignee.id, 'totalHours', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                          step="0.1"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="number"
                          value={assignee.estTime}
                          onChange={(e) => handleUpdateAssignee(assignee.id, 'estTime', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                          step="0.1"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 text-right whitespace-nowrap">
                        <button 
                          onClick={() => handleAddTimeEntry(assignee.id)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none mr-2"
                          title="Add time entry"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveAssignee(assignee.id)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                          title="Remove assignee"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
        
      default:
        return (
          <div className="py-4 text-center text-neutral-500">
            No content for this widget type
          </div>
        )
    }
  }
  
  return (
    <div 
      className={`mb-5 border rounded-lg bg-white shadow-sm overflow-hidden ${widget.isDragging ? 'opacity-50 border-dashed border-blue-400' : ''}`}
      draggable={true}
      onDragStart={(e) => handleWidgetDragStart(e, widget.id)}
      onDragEnd={handleWidgetDragEnd}
      onDragOver={handleWidgetDragOver}
      onDrop={(e) => handleWidgetDrop(e, widget.id)}
    >
      <div className="bg-neutral-50 border-b px-4 py-2 flex items-center justify-between widget-drag-handle cursor-grab">
        <div className="font-medium flex items-center">
          <span className="mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </span>
          {widget.title}
        </div>
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => toggleWidgetCollapse(widget.id)}
            className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
            title={widget.isCollapsed ? "Expand" : "Collapse"}
          >
            {widget.isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
          <button 
            onClick={() => removeWidget(widget.id)}
            className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
            title="Remove widget"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {!widget.isCollapsed && (
        <div className="p-4">
          {renderWidgetContent()}
        </div>
      )}
    </div>
  )
}

export default TicketWidget 