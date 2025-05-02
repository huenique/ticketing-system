import React from "react";
import { TimeEntry } from "../../types/tickets";

interface TimeEntriesWidgetProps {
  timeEntries: TimeEntry[];
  handleUpdateTimeEntry?: (id: string, field: string, value: string) => void;
  handleRemoveTimeEntry?: (id: string) => void;
}

const TimeEntriesWidget: React.FC<TimeEntriesWidgetProps> = ({
  timeEntries,
  handleUpdateTimeEntry,
  handleRemoveTimeEntry,
}) => {
  return (
    <div className="overflow-auto">
      {timeEntries?.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Assignee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Start Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Stop Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Duration (hrs)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {timeEntries.map((entry, index) => (
                <tr key={`time-entry-${entry.id || index}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.assigneeName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="time"
                      value={entry.startTime}
                      onChange={(e) =>
                        handleUpdateTimeEntry &&
                        handleUpdateTimeEntry(
                          entry.id,
                          "startTime",
                          e.target.value,
                        )
                      }
                      className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="time"
                      value={entry.stopTime}
                      onChange={(e) =>
                        handleUpdateTimeEntry &&
                        handleUpdateTimeEntry(
                          entry.id,
                          "stopTime",
                          e.target.value,
                        )
                      }
                      className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="bg-neutral-100 px-2 py-1 rounded">{entry.duration} hours</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.dateCreated}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <input
                      type="text"
                      value={entry.remarks}
                      onChange={(e) =>
                        handleUpdateTimeEntry &&
                        handleUpdateTimeEntry(
                          entry.id,
                          "remarks",
                          e.target.value,
                        )
                      }
                      className="block w-full rounded-md border-none py-1 px-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-transparent hover:bg-neutral-50"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {entry.files && entry.files.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {entry.files.map((file, index) => (
                          <span 
                            key={`${entry.id}-file-${index}-${file}`}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            title={file}
                          >
                            File {index + 1}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No files</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    {handleRemoveTimeEntry && (
                      <button
                        onClick={() => handleRemoveTimeEntry(entry.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove Time Entry"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-4 text-neutral-500 text-sm bg-neutral-50 rounded-md">
          No time entries recorded yet.
        </div>
      )}
    </div>
  );
};

export default TimeEntriesWidget; 