import { PartsWidget } from "./components/PartsWidget";
import AttachmentsWidget from "@/components/widgets/AttachmentsWidget";
import AssigneeTableWidget from "@/components/widgets/AssigneeTableWidget";
import TimeEntriesWidget from "@/components/widgets/TimeEntriesWidget";

export const widgetRegistry: Record<string, React.ComponentType<any>> = {
  field_parts: PartsWidget,
  field_attachments_gallery: AttachmentsWidget,
  field_assignee_table: AssigneeTableWidget,
  field_time_entries_table: TimeEntriesWidget,
}; 