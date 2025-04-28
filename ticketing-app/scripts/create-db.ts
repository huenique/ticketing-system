import * as dotenv from "dotenv";
import { AppwriteException, Client, Databases, Permission, Role } from "node-appwrite";

dotenv.config();

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
  const missingVars: string[] = [];
  if (!VITE_APPWRITE_ENDPOINT) missingVars.push("VITE_APPWRITE_ENDPOINT");
  if (!VITE_APPWRITE_PROJECT_ID) missingVars.push("VITE_APPWRITE_PROJECT_ID");
  if (!VITE_APPWRITE_API_KEY) missingVars.push("VITE_APPWRITE_API_KEY");
  if (!VITE_APPWRITE_DATABASE_ID) missingVars.push("VITE_APPWRITE_DATABASE_ID");
  console.error(`Missing environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
}

const client = new Client()
  .setEndpoint(VITE_APPWRITE_ENDPOINT)
  .setProject(VITE_APPWRITE_PROJECT_ID)
  .setKey(VITE_APPWRITE_API_KEY);

const databases = new Databases(client);
const dbId = VITE_APPWRITE_DATABASE_ID;

async function createCollectionIfNotExists(collectionId: string, name: string) {
  try {
    await databases.getCollection(dbId, collectionId);
    console.log(`ℹ️ Collection '${collectionId}' already exists. Skipping.`);
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 404) {
      console.log(`➕ Creating collection '${collectionId}'...`);
      await databases.createCollection(dbId, collectionId, name, [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]);
    } else {
      throw error;
    }
  }
}

async function createAttributeSafe(
  collectionId: string,
  type: "string" | "float" | "datetime",
  key: string,
  sizeOrRequired: number | boolean,
  requiredOrDefault?: boolean | string,
  defaultOrArray?: string | boolean,
  array?: boolean,
) {
  try {
    const collection = await databases.getCollection(dbId, collectionId);
    if (collection.attributes.some((attr) => attr.key === key)) {
      console.log(
        `ℹ️ Attribute '${key}' in '${collectionId}' already exists. Skipping.`,
      );
      return;
    }
  } catch (error) {
    console.error(`❌ Error checking attributes for '${collectionId}':`, error);
    throw error;
  }

  switch (type) {
    case "string":
      await databases.createStringAttribute(
        dbId,
        collectionId,
        key,
        sizeOrRequired as number,
        requiredOrDefault as boolean,
        defaultOrArray as string | undefined,
        array,
      );
      break;
    case "float":
      await databases.createFloatAttribute(
        dbId,
        collectionId,
        key,
        sizeOrRequired as boolean,
      );
      break;
    case "datetime":
      await databases.createDatetimeAttribute(
        dbId,
        collectionId,
        key,
        sizeOrRequired as boolean,
      );
      break;
  }
}

async function createCollections() {
  // Tickets
  await createCollectionIfNotExists("tickets", "Tickets");
  await createAttributeSafe("tickets", "string", "status_id", 255, true);
  await createAttributeSafe("tickets", "string", "customer_id", 255, true);
  await createAttributeSafe("tickets", "datetime", "created_at", true);
  await createAttributeSafe("tickets", "datetime", "updated_at", true);
  await createAttributeSafe("tickets", "float", "billable_hours", true);
  await createAttributeSafe("tickets", "float", "total_hours", true);
  await createAttributeSafe("tickets", "string", "description", 1000, true);
  await createAttributeSafe(
    "tickets",
    "string",
    "assignee_ids",
    255,
    false,
    undefined,
    true,
  );
  await createAttributeSafe(
    "tickets",
    "string",
    "attachments",
    255,
    false,
    undefined,
    true,
  );

  // Users
  await createCollectionIfNotExists("users", "Users");
  await createAttributeSafe("users", "string", "first_name", 255, true);
  await createAttributeSafe("users", "string", "last_name", 255, true);
  await createAttributeSafe("users", "string", "username", 255, true, undefined, false);
  await createAttributeSafe("users", "string", "user_type_id", 255, true);

  // User Types
  await createCollectionIfNotExists("user_types", "User Types");
  await createAttributeSafe("user_types", "string", "label", 255, true);

  // Statuses
  await createCollectionIfNotExists("statuses", "Statuses");
  await createAttributeSafe("statuses", "string", "label", 255, true);

  // Customers
  await createCollectionIfNotExists("customers", "Customers");
  await createAttributeSafe("customers", "string", "name", 255, true);
  await createAttributeSafe("customers", "string", "address", 255, true);
  await createAttributeSafe("customers", "string", "primary_contact_name", 255, true);
  await createAttributeSafe("customers", "string", "primary_contact_number", 255, true);
  await createAttributeSafe("customers", "string", "primary_email", 255, true);
  await createAttributeSafe("customers", "string", "abn", 255, false);

  // Customer Contacts
  await createCollectionIfNotExists("customer_contacts", "Customer Contacts");
  await createAttributeSafe("customer_contacts", "string", "customer_id", 255, true);
  await createAttributeSafe("customer_contacts", "string", "first_name", 255, true);
  await createAttributeSafe("customer_contacts", "string", "last_name", 255, true);
  await createAttributeSafe("customer_contacts", "string", "position", 255, false);
  await createAttributeSafe("customer_contacts", "string", "contact_number", 255, true);
  await createAttributeSafe("customer_contacts", "string", "email", 255, true);

  // Ticket Assignments
  await createCollectionIfNotExists("ticket_assignments", "Ticket Assignments");
  await createAttributeSafe("ticket_assignments", "string", "ticket_id", 255, true);
  await createAttributeSafe("ticket_assignments", "string", "user_id", 255, true);
  await createAttributeSafe("ticket_assignments", "string", "work_description", 1000, false);
  await createAttributeSafe("ticket_assignments", "float", "estimated_time", true);
  await createAttributeSafe("ticket_assignments", "float", "actual_time", true);
  await createAttributeSafe("ticket_assignments", "string", "status_id", 255, true);

  // Time Entries
  await createCollectionIfNotExists("time_entries", "Time Entries");
  await createAttributeSafe("time_entries", "string", "ticket_id", 255, true);
  await createAttributeSafe("time_entries", "string", "user_id", 255, true);
  await createAttributeSafe("time_entries", "datetime", "start_time", true);
  await createAttributeSafe("time_entries", "datetime", "stop_time", true);
  await createAttributeSafe("time_entries", "float", "total_duration", true);
  await createAttributeSafe("time_entries", "string", "remarks", 1000, false);
  await createAttributeSafe(
    "time_entries",
    "string",
    "files",
    255,
    false,
    undefined,
    true,
  );
}

createCollections()
  .then(() => console.log("✅ Database setup complete."))
  .catch((error) => {
    console.error("❌ Error creating collections:", error);
    process.exit(1);
  });
