import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const dbId = process.env.APPWRITE_DATABASE_ID || '';

async function createCollections() {
  // Create user_types collection first
  await databases.createCollection(
    dbId, 
    'user_types', 
    'User Types',
    ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
  );

  // Add attributes to user_types collection
  await databases.createStringAttribute(dbId, 'user_types', 'label', 255, true);

  // Create users collection
  await databases.createCollection(
    dbId, 
    'users', 
    'Users',
    ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
  );

  // Add attributes to users collection
  await databases.createStringAttribute(dbId, 'users', 'first_name', 255, true);
  await databases.createStringAttribute(dbId, 'users', 'last_name', 255, true);
  await databases.createStringAttribute(dbId, 'users', 'username', 255, true);
  // Changed user_type_id to relationship attribute
  await databases.createRelationshipAttribute(
    dbId,
    'users',
    'user_types',
    'manyToOne' as any,
    false,
    'user_type_id',
    undefined,
    'cascade' as any
  );

  // Create statuses collection
  await databases.createCollection(
    dbId, 
    'statuses', 
    'Statuses',
    ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
  );

  // Add attributes to statuses collection
  await databases.createStringAttribute(dbId, 'statuses', 'label', 255, true);

  // Create customers collection
  await databases.createCollection(
    dbId, 
    'customers', 
    'Customers',
    ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
  );

  // Add attributes to customers collection
  await databases.createStringAttribute(dbId, 'customers', 'name', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'address', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'primary_contact_name', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'primary_contact_number', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'primary_email', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'abn', 255, false);

  // Create customer_contacts collection
  await databases.createCollection(
    dbId, 
    'customer_contacts', 
    'Customer Contacts',
    ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
  );

  // Add attributes to customer_contacts collection
  // Changed customer_id to relationship attribute
  await databases.createRelationshipAttribute(
    dbId,
    'customer_contacts',
    'customers',
    'manyToMany' as any,
    false,
    'customer_id',
    undefined,
    'cascade' as any
  );
  await databases.createStringAttribute(dbId, 'customer_contacts', 'first_name', 255, true);
  await databases.createStringAttribute(dbId, 'customer_contacts', 'last_name', 255, true);
  await databases.createStringAttribute(dbId, 'customer_contacts', 'position', 255, false);
  await databases.createStringAttribute(dbId, 'customer_contacts', 'contact_number', 255, true);
  await databases.createStringAttribute(dbId, 'customer_contacts', 'email', 255, true);

  // Create tickets collection
  await databases.createCollection(
    dbId, 
    'tickets', 
    'Tickets',
    ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
  );

  // Add attributes to tickets collection
  await databases.createRelationshipAttribute(
    dbId,
    'tickets',
    'statuses',
    'manyToOne' as any,
    false,
    'status_id',
    undefined,
    'cascade' as any
  );
  await databases.createRelationshipAttribute(
    dbId,
    'tickets',
    'customers', 
    'manyToOne' as any,
    false,
    'customer_id',
    undefined,
    'cascade' as any
  );
  // Changed assignee_ids to relationship attribute
  await databases.createRelationshipAttribute(
    dbId,
    'tickets',
    'users',
    'manyToMany' as any,
    false,
    'assignee_ids',
    undefined,
    'cascade' as any
  );
  await databases.createFloatAttribute(dbId, 'tickets', 'billable_hours', true);
  await databases.createFloatAttribute(dbId, 'tickets', 'total_hours', true);
  await databases.createStringAttribute(dbId, 'tickets', 'description', 1000, true);
  await databases.createStringAttribute(dbId, 'tickets', 'attachments', 255, false, undefined, true);
  
  // Add assignment_id to tickets collection
  await databases.createRelationshipAttribute(
    dbId,
    'tickets',
    'ticket_assignments',
    'oneToMany' as any,
    false,
    'assignment_id',
    undefined,
    'cascade' as any
  );

  // Create ticket_assignments collection
  await databases.createCollection(
    dbId, 
    'ticket_assignments', 
    'Ticket Assignments',
    ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
  );

  // Add attributes to ticket_assignments collection
  await databases.createStringAttribute(dbId, 'ticket_assignments', 'work_description', 1000, true);
  await databases.createStringAttribute(dbId, 'ticket_assignments', 'estimated_time', 255, true);
  await databases.createStringAttribute(dbId, 'ticket_assignments', 'actual_time', 255, true);
  await databases.createRelationshipAttribute(
    dbId,
    'ticket_assignments',
    'users',
    'manyToOne' as any,
    false,
    'user_id',
    undefined,
    'cascade' as any
  );

  // Create relationship between ticket_assignments and tickets
  await databases.createRelationshipAttribute(
    dbId,
    'ticket_assignments',
    'tickets',
    'manyToOne' as any,
    false,
    'ticket_id',
    undefined,
    'cascade' as any
  );

  // Create time_entries collection
  await databases.createCollection(
    dbId, 
    'time_entries', 
    'Time Entries',
    ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
  );

  // Add attributes to time_entries collection
  await databases.createStringAttribute(dbId, 'time_entries', 'start_time', 255, true);
  await databases.createStringAttribute(dbId, 'time_entries', 'stop_time', 255, true);
  await databases.createStringAttribute(dbId, 'time_entries', 'total_duration', 255, true);
  await databases.createStringAttribute(dbId, 'time_entries', 'remarks', 1000, true);
  await databases.createStringAttribute(dbId, 'time_entries', 'files', 255, false, undefined, true);
  await databases.createRelationshipAttribute(
    dbId,
    'time_entries',
    'tickets',
    'manyToOne' as any,
    false,
    'ticket_id',
    undefined,
    'cascade' as any
  );
  await databases.createRelationshipAttribute(
    dbId,
    'time_entries',
    'users',
    'manyToOne' as any,
    false,
    'user_id',
    undefined,
    'cascade' as any
  );
}

createCollections().catch(console.error);