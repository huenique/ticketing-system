import React from 'react'
import { Widget, TicketForm, Assignee, TimeEntry } from '../types/tickets'
import { cn } from '../lib/utils'

interface TicketWidgetProps {
  widget: Widget
  ticketForm: TicketForm
  currentTicket?: Record<string, any> | null
  handleFieldChange: (fieldName: string, value: any) => void
  toggleWidgetCollapse: (widgetId: string) => void
  removeWidget: (widgetId: string) => void
  
  // Additional props for specific widget types
  assignees?: Assignee[]
  timeEntries?: TimeEntry[]
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
  
  // Function to handle remove click with extra measures to prevent drag
  const handleRemoveClick = (e: React.MouseEvent) => {
    // These two lines are crucial to prevent the drag behavior
    e.stopPropagation();
    e.preventDefault();
    
    // Remove the widget
    removeWidget(widget.id);
    
    // Return false to further prevent default behaviors
    return false;
  };

  const renderWidgetContent = () => {
    if (widget.isCollapsed) return null
    
    // First check if it's an individual field widget
    if (widget.fieldType) {
      switch (widget.fieldType) {
        case 'select':
          return (
            <div className="h-full flex items-center">
              <select
                id={widget.fieldName}
                value={ticketForm[widget.fieldName as keyof typeof ticketForm] || widget.fieldValue}
                onChange={(e) => handleFieldChange(widget.fieldName || '', e.target.value)}
                className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
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
            <div className="py-2 px-3 h-full flex items-center bg-neutral-50 rounded-md border border-neutral-200 overflow-auto">
              {widget.fieldValue}
            </div>
          )
          
        case 'number':
          return (
            <div className="h-full flex items-center">
              <input
                type="number"
                id={widget.fieldName}
                value={ticketForm[widget.fieldName as keyof typeof ticketForm] || widget.fieldValue}
                onChange={(e) => handleFieldChange(widget.fieldName || '', e.target.value)}
                className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                step="0.1"
                min="0"
              />
            </div>
          )
          
        case 'textarea':
          return (
            <div className="h-full flex flex-col">
              <textarea
                id={widget.fieldName}
                value={ticketForm[widget.fieldName as keyof typeof ticketForm] || widget.fieldValue}
                onChange={(e) => handleFieldChange(widget.fieldName || '', e.target.value)}
                className="block w-full h-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm resize-none"
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
              <div className="h-[38px]">
                <select
                  id="status"
                  value={ticketForm.status}
                  onChange={(e) => setTicketForm({...ticketForm, status: e.target.value})}
                  className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
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
                <div className="py-2 px-3 h-[38px] bg-neutral-50 rounded-md border border-neutral-200 overflow-auto">
                  {currentTicket?.cells['col-3']}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="py-2 px-3 h-[38px] bg-neutral-50 rounded-md border border-neutral-200 overflow-auto">
                    {currentTicket?.cells['col-2']}
                  </div>
                </div>
                <div>
                  <div className="py-2 px-3 h-[38px] bg-neutral-50 rounded-md border border-neutral-200 overflow-auto">
                    {currentTicket?.cells['col-10']}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="h-[38px]">
                  <input
                    type="number"
                    id="billableHours"
                    value={ticketForm.billableHours}
                    onChange={(e) => setTicketForm({...ticketForm, billableHours: e.target.value})}
                    className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    step="0.1"
                    min="0"
                  />
                </div>
                <div className="h-[38px]">
                  <input
                    type="number"
                    id="totalHours"
                    value={ticketForm.totalHours}
                    onChange={(e) => setTicketForm({...ticketForm, totalHours: e.target.value})}
                    className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <textarea
                  id="description"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})}
                  rows={5}
                  className="block w-full rounded-md border border-neutral-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )
      
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
        
      case 'time_entries':
        if (!handleUpdateTimeEntry || !handleRemoveTimeEntry) {
          return null
        }
        
        return (
          <div>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Assignee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Start Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Stop Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Remarks</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {timeEntries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 text-center text-sm text-neutral-500">
                        No time entries recorded yet
                      </td>
                    </tr>
                  )}
                  {timeEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.assigneeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="time"
                          value={entry.startTime}
                          onChange={(e) => handleUpdateTimeEntry(entry.id, 'startTime', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="time"
                          value={entry.stopTime}
                          onChange={(e) => handleUpdateTimeEntry(entry.id, 'stopTime', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.duration} hrs
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        {entry.dateCreated}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900">
                        <input
                          type="text"
                          value={entry.remarks}
                          onChange={(e) => handleUpdateTimeEntry(entry.id, 'remarks', e.target.value)}
                          className="w-full bg-transparent border-0 focus:ring-0 p-0"
                          placeholder="Add remarks..."
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-900 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleRemoveTimeEntry(entry.id)}
                          className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                          title="Remove time entry"
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
        
      case 'attachments':
        if (!handleImageUpload || !setUploadedImages) {
          return null
        }
        
        return (
          <div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-neutral-700">
                  Upload Images or Files
                </label>
                <label className="cursor-pointer rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600">
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload
                  </span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    multiple 
                    onChange={handleImageUpload} 
                  />
                </label>
              </div>
              
              {uploadedImages.length === 0 ? (
                <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-neutral-500">
                    Drag and drop files here or click the upload button
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden border border-neutral-200">
                        <img 
                          src={image} 
                          alt={`Uploaded image ${index + 1}`} 
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <button
                        onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-opacity"
                        title="Remove image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
    <div className="w-full h-full bg-white rounded-lg border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
      {/* Widget header for dragging and controls */}
      <div className="bg-neutral-50 border-b border-neutral-200 p-2 flex items-center justify-between react-grid-dragHandle">
        <h3 className="text-sm font-medium text-neutral-700 truncate">
          {widget.title || 'Widget'}
        </h3>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => toggleWidgetCollapse(widget.id)}
            className="h-5 w-5 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
            title={widget.isCollapsed ? "Expand" : "Collapse"}
          >
            {widget.isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
          <button
            onClick={handleRemoveClick}
            className="h-5 w-5 flex items-center justify-center rounded-full text-neutral-500 hover:bg-red-100 hover:text-red-500"
            title="Remove Widget"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Widget content - adjust to fill remaining height */}
      <div className={cn(
        "p-3 flex-1 overflow-y-auto",
        widget.isCollapsed ? "hidden" : "flex flex-col h-full"
      )}>
        {renderWidgetContent()}
      </div>
    </div>
  )
}

export default TicketWidget 