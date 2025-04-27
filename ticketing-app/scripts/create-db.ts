import * as dotenv from 'dotenv';
import { Client, Databases } from 'node-appwrite';

dotenv.config(); // Load .env file

const {
  VITE_APPWRITE_ENDPOINT,
  VITE_APPWRITE_PROJECT_ID,
  VITE_APPWRITE_API_KEY,
  VITE_APPWRITE_DATABASE_ID,
} = process.env;

if (!VITE_APPWRITE_ENDPOINT || !VITE_APPWRITE_PROJECT_ID || !VITE_APPWRITE_API_KEY || !VITE_APPWRITE_DATABASE_ID) {
  const missingVars: string[] = [];
  if (!VITE_APPWRITE_ENDPOINT) missingVars.push('VITE_APPWRITE_ENDPOINT');
  if (!VITE_APPWRITE_PROJECT_ID) missingVars.push('VITE_APPWRITE_PROJECT_ID');
  if (!VITE_APPWRITE_API_KEY) missingVars.push('VITE_APPWRITE_API_KEY');
  if (!VITE_APPWRITE_DATABASE_ID) missingVars.push('VITE_APPWRITE_DATABASE_ID');
  console.error(`Missing environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const client = new Client()
  .setEndpoint(VITE_APPWRITE_ENDPOINT)
  .setProject(VITE_APPWRITE_PROJECT_ID)
  .setKey(VITE_APPWRITE_API_KEY);

const databases = new Databases(client);
const dbId = VITE_APPWRITE_DATABASE_ID;

async function createCollections() {
  // Create user_types collection
  await databases.createCollection(dbId, 'user_types', 'User Types');
  await databases.createStringAttribute(dbId, 'user_types', 'label', 255, true);

  // Create users collection
  await databases.createCollection(dbId, 'users', 'Users');
  await databases.createStringAttribute(dbId, 'users', 'first_name', 255, true);
  await databases.createStringAttribute(dbId, 'users', 'last_name', 255, true);
  await databases.createStringAttribute(dbId, 'users', 'username', 255, true);
  await databases.createRelationshipAttribute(dbId, 'users', 'user_types', 'manyToOne' as never, false, 'user_type_id', undefined, 'cascade' as never);

  // Create statuses collection
  await databases.createCollection(dbId, 'statuses', 'Statuses');
  await databases.createStringAttribute(dbId, 'statuses', 'label', 255, true);

  // Create customers collection
  await databases.createCollection(dbId, 'customers', 'Customers');
  await databases.createStringAttribute(dbId, 'customers', 'name', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'address', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'primary_contact_name', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'primary_contact_number', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'primary_email', 255, true);
  await databases.createStringAttribute(dbId, 'customers', 'abn', 255, false);

  // Create customer_contacts collection
  await databases.createCollection(dbId, 'customer_contacts', 'Customer Contacts');
  await databases.createRelationshipAttribute(dbId, 'customer_contacts', 'customers', 'manyToMany' as never, false, 'customer_id', undefined, 'cascade' as never);
  await databases.createStringAttribute(dbId, 'customer_contacts', 'first_name', 255, true);
  await databases.createStringAttribute(dbId, 'customer_contacts', 'last_name', 255, true);
  await databases.createStringAttribute(dbId, 'customer_contacts', 'position', 255, false);
  await databases.createStringAttribute(dbId, 'customer_contacts', 'contact_number', 255, true);
  await databases.createStringAttribute(dbId, 'customer_contacts', 'email', 255, true);

  // Create tickets collection
  await databases.createCollection(dbId, 'tickets', 'Tickets');
  await databases.createRelationshipAttribute(dbId, 'tickets', 'statuses', 'manyToOne' as never, false, 'status_id', undefined, 'cascade' as never);
  await databases.createRelationshipAttribute(dbId, 'tickets', 'customers', 'manyToOne' as never, false, 'customer_id', undefined, 'cascade' as never);
  await databases.createRelationshipAttribute(dbId, 'tickets', 'users', 'manyToMany' as never, false, 'assignee_ids', undefined, 'cascade' as never);
  await databases.createFloatAttribute(dbId, 'tickets', 'billable_hours', true);
  await databases.createFloatAttribute(dbId, 'tickets', 'total_hours', true);
  await databases.createStringAttribute(dbId, 'tickets', 'description', 1000, true);
  await databases.createStringAttribute(dbId, 'tickets', 'attachments', 255, false, undefined, true);
}

createCollections()
  .then(() => console.log('Database setup complete.'))
  .catch((error) => {
    console.error('Error creating collections:', error);
    process.exit(1);
  });
