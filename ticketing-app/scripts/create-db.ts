import dotenv from 'dotenv';
import { Client, Databases, RelationMutate, RelationshipType, IndexType } from 'node-appwrite';

// Load environment variables
dotenv.config();

// Validate essential env vars
const {
  VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT_ID,
  VITE_APPWRITE_API_KEY,
  VITE_APPWRITE_DATABASE_ID,
} = process.env;

if (
  !VITE_APPWRITE_ENDPOINT ||
  !VITE_APPWRITE_PROJECT_ID ||
  !VITE_APPWRITE_API_KEY ||
  !VITE_APPWRITE_DATABASE_ID
) {
  console.error(
    'Error: Missing one of the required env vars: VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_API_KEY, VITE_APPWRITE_DATABASE_ID'
  );
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(VITE_APPWRITE_ENDPOINT)
  .setProject(VITE_APPWRITE_PROJECT_ID)
  .setKey(VITE_APPWRITE_API_KEY);

const databases = new Databases(client);
const dbId = VITE_APPWRITE_DATABASE_ID;

// Helper to ignore "already exists" errors
async function safe<T>(fn: () => Promise<T>, name: string) {
  try {
    return await fn();
  } catch (err) {
    if (err.code === 409) {
      console.log(`Skipping existing: ${name}`);
      return;
    }
    throw err;
  }
}

async function createCollections() {
  // 1. user_types
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'user_types',
        'User Types',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection user_types'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'user_types', 'label', 255, true),
    'attribute user_types.label'
  );

  // 2. users
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'users',
        'Users',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection users'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'users', 'first_name', 255, true),
    'attribute users.first_name'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'users', 'last_name', 255, true),
    'attribute users.last_name'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'users', 'username', 255, true),
    'attribute users.username'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'users', 'auth_user_id', 255, false),
    'attribute users.auth_user_id'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'users',
        'user_types',
        'manyToOne'as RelationshipType,
        false,
        'user_type_id',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship users.user_type_id'
  );

  // 3. statuses
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'statuses',
        'Statuses',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection statuses'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'statuses', 'label', 255, true),
    'attribute statuses.label'
  );

  // 4. customers
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'customers',
        'Customers',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection customers'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'customers', 'name', 255, true),
    'attribute customers.name'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'customers', 'address', 255, true),
    'attribute customers.address'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'customers',
        'primary_contact_name',
        255,
        false
      ),
    'attribute customers.primary_contact_name'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'customers',
        'primary_contact_number',
        255,
        false
      ),
    'attribute customers.primary_contact_number'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'customers', 'primary_email', 255, false),
    'attribute customers.primary_email'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'customers', 'abn', 255, false),
    'attribute customers.abn'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'customers',
        'customer_contacts',
        'manyToMany' as RelationshipType,
        false,
        'customer_contact_ids',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship customers.customer_contact_ids'
  );
  
  // Add fulltext indexes for customers
  await safe(
    () =>
      databases.createIndex(
        dbId,
        'customers',
        'customers_name_fulltext',
        'fulltext' as IndexType,
        ['name'],
        ['ASC']
      ),
    'index customers_name_fulltext'
  );
  await safe(
    () =>
      databases.createIndex(
        dbId,
        'customers',
        'customers_address_fulltext',
        'fulltext' as IndexType,
        ['address'],
        ['ASC']
      ),
    'index customers_address_fulltext'
  );
  await safe(
    () =>
      databases.createIndex(
        dbId,
        'customers',
        'customers_pcn_fulltext',
        'fulltext' as IndexType,
        ['primary_contact_name'],
        ['ASC']
      ),
    'index customers_pcn_fulltext'
  );
  await safe(
    () =>
      databases.createIndex(
        dbId,
        'customers',
        'customers_pcnum_fulltext',
        'fulltext' as IndexType,
        ['primary_contact_number'],
        ['ASC']
      ),
    'index customers_pcnum_fulltext'
  );
  await safe(
    () =>
      databases.createIndex(
        dbId,
        'customers',
        'customers_pe_fulltext',
        'fulltext' as IndexType,
        ['primary_email'],
        ['ASC']
      ),
    'index customers_pe_fulltext'
  );
  await safe(
    () =>
      databases.createIndex(
        dbId,
        'customers',
        'customers_abn_fulltext',
        'fulltext' as IndexType,
        ['abn'],
        ['ASC']
      ),
    'index customers_abn_fulltext'
  );

  // 5. customer_contacts
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'customer_contacts',
        'Customer Contacts',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection customer_contacts'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'customer_contacts',
        'customers',
        'manyToMany' as RelationshipType,
        false,
        'customer_ids',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship customer_contacts.customer_ids'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'customer_contacts',
        'first_name',
        255,
        true
      ),
    'attribute customer_contacts.first_name'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'customer_contacts',
        'last_name',
        255,
        true
      ),
    'attribute customer_contacts.last_name'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'customer_contacts',
        'position',
        255,
        false
      ),
    'attribute customer_contacts.position'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'customer_contacts',
        'contact_number',
        255,
        true
      ),
    'attribute customer_contacts.contact_number'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'customer_contacts', 'email', 255, true),
    'attribute customer_contacts.email'
  );

  // 6. tickets
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'tickets',
        'Tickets',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection tickets'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'tickets',
        'statuses',
        'manyToOne'as RelationshipType,
        false,
        'status_id',
        undefined,
        'setNull' as RelationMutate,
      ),
    'relationship tickets.status_id'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'tickets',
        'customers',
        'manyToOne'as RelationshipType,
        false,
        'customer_id',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship tickets.customer_id'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'tickets',
        'users',
        'manyToMany' as RelationshipType,
        false,
        'assignee_ids',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship tickets.assignee_ids'
  );
  await safe(
    () => databases.createFloatAttribute(dbId, 'tickets', 'billable_hours', true),
    'attribute tickets.billable_hours'
  );
  await safe(
    () => databases.createFloatAttribute(dbId, 'tickets', 'total_hours', true),
    'attribute tickets.total_hours'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'tickets',
        'description',
        1000,
        true
      ),
    'attribute tickets.description'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'tickets',
        'workflow',
        255,
        true
      ),
    'attribute tickets.workflow'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'tickets',
        'attachments',
        255,
        false,
        undefined,
        true
      ),
    'attribute tickets.attachments'
  );

  // 7. ticket_assignments
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'ticket_assignments',
        'Ticket Assignments',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection ticket_assignments'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'ticket_assignments',
        'work_description',
        1000,
        true
      ),
    'attribute ticket_assignments.work_description'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'ticket_assignments',
        'estimated_time',
        255,
        true
      ),
    'attribute ticket_assignments.estimated_time'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'ticket_assignments',
        'priority',
        255,
        false
      ),
    'attribute ticket_assignments.priority'
  );
  await safe(
    () =>
      databases.createBooleanAttribute(
        dbId,
        'ticket_assignments',
        'is_done',
        false
      ),
    'attribute ticket_assignments.is_done'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'ticket_assignments',
        'actual_time',
        255,
        true
      ),
    'attribute ticket_assignments.actual_time'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'ticket_assignments',
        'users',
        'manyToOne'as RelationshipType,
        false,
        'user_id',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship ticket_assignments.user_id'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'ticket_assignments',
        'tickets',
        'manyToOne'as RelationshipType,
        false,
        'ticket_id',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship ticket_assignments.ticket_id'
  );

  // 8. add assignment_id on tickets
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'tickets',
        'ticket_assignments',
        'oneToMany' as RelationshipType,
        false,
        'assignment_id',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship tickets.assignment_id'
  );

  // 9. parts
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'parts',
        'Parts',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection parts'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'parts', 'description', 255, true),
    'attribute parts.description'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'parts', 'item_number', 255, false),
    'attribute parts.item_number'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'parts', 'quantity', 255, true),
    'attribute parts.quantity'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'parts', 'price', 255, true),
    'attribute parts.price'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'parts', 'vendor', 255, true),
    'attribute parts.vendor'
  );
  await safe(
    () => databases.createDatetimeAttribute(dbId, 'parts', 'created_at', false),
    'attribute parts.created_at'
  );
  await safe(
    () => databases.createDatetimeAttribute(dbId, 'parts', 'updated_at', false),
    'attribute parts.updated_at'
  );
  
  // Add fulltext indexes for parts
  await safe(
    () =>
      databases.createIndex(
        dbId,
        'parts',
        'parts_description_fulltext',
        'fulltext' as IndexType,
        ['description'],
        ['ASC']
      ),
    'index parts_description_fulltext'
  );
  await safe(
    () =>
      databases.createIndex(
        dbId,
        'parts',
        'parts_item_number_fulltext',
        'fulltext' as IndexType,
        ['item_number'],
        ['ASC']
      ),
    'index parts_item_number_fulltext'
  );
  await safe(
    () =>
      databases.createIndex(
        dbId,
        'parts',
        'parts_vendor_fulltext',
        'fulltext' as IndexType,
        ['vendor'],
        ['ASC']
      ),
    'index parts_vendor_fulltext'
  );

  // 10. add part_ids on tickets
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'tickets',
        'parts',
        'manyToMany' as RelationshipType,
        false,
        'part_ids',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship tickets.part_ids'
  );

  // 9. time_entries
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'time_entries',
        'Time Entries',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection time_entries'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'time_entries',
        'start_time',
        255,
        true
      ),
    'attribute time_entries.start_time'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'time_entries',
        'stop_time',
        255,
        true
      ),
    'attribute time_entries.stop_time'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'time_entries',
        'total_duration',
        255,
        true
      ),
    'attribute time_entries.total_duration'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'time_entries',
        'remarks',
        1000,
        true
      ),
    'attribute time_entries.remarks'
  );
  await safe(
    () =>
      databases.createStringAttribute(
        dbId,
        'time_entries',
        'files',
        255,
        false,
        undefined,
        true
      ),
    'attribute time_entries.files'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'time_entries',
        'tickets',
        'manyToOne'as RelationshipType,
        false,
        'ticket_id',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship time_entries.ticket_id'
  );
  await safe(
    () =>
      databases.createRelationshipAttribute(
        dbId,
        'time_entries',
        'users',
        'manyToOne'as RelationshipType,
        false,
        'user_id',
        undefined,
        'cascade' as RelationMutate,
      ),
    'relationship time_entries.user_id'
  );

  // 11. sidebar
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'sidebar',
        'Sidebar',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection sidebar'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'sidebar', 'title', 255, true),
    'attribute sidebar.title'
  );

  // Add workflows collection
  await safe(
    () =>
      databases.createCollection(
        dbId,
        'workflows',
        'Workflows',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      ),
    'collection workflows'
  );
  await safe(
    () => databases.createStringAttribute(dbId, 'workflows', 'name', 255, true),
    'attribute workflows.name'
  );
}

createCollections().catch(err => {
  console.error('Failed to create collections:', err);
  process.exit(1);
});
