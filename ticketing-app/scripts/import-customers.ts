import dotenv from 'dotenv';
import { Client, Databases, ID } from 'node-appwrite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    'Error: Missing required env vars: VITE_APPWRITE_ENDPOINT, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_API_KEY, VITE_APPWRITE_DATABASE_ID'
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
const collectionId = 'customers';

// Make sure the customers collection exists
async function ensureCustomersCollectionExists() {
  try {
    // Check if collection exists by trying to get it
    await databases.getCollection(dbId, collectionId);
    console.log('Customers collection already exists');
  } catch (error: any) {
    // Create collection if it doesn't exist
    if (error.code === 404) {
      console.log('Creating customers collection...');
      
      await databases.createCollection(
        dbId,
        collectionId,
        'Customers',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      );

      // Add attributes based on the required schema
      await databases.createStringAttribute(dbId, collectionId, 'name', 255, true);
      await databases.createStringAttribute(dbId, collectionId, 'address', 255, true);
      await databases.createStringAttribute(dbId, collectionId, 'primary_contact_name', 255, true);
      await databases.createStringAttribute(dbId, collectionId, 'primary_contact_number', 255, true);
      await databases.createStringAttribute(dbId, collectionId, 'primary_email', 255, true);
      await databases.createStringAttribute(dbId, collectionId, 'abn', 255, false);
      
      console.log('Customers collection and attributes created successfully');
    } else {
      console.error('Error checking collection:', error);
      process.exit(1);
    }
  }
}

// Function to process the TXT data and import to Appwrite
async function importCustomersFromTxt() {
  const filePath = path.resolve(__dirname, '../CUST 2.TXT');
  console.log(`Reading file from: ${filePath}`);

  // Ensure the collection exists before importing
  await ensureCustomersCollectionExists();

  // Read the file as a string
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Split by lines and remove the first line (empty JSON object)
  const lines = fileContent.split('\n');
  if (lines.length < 2) {
    console.error('File format invalid');
    process.exit(1);
  }
  
  // Remove first line (empty JSON object) and get headers from second line
  lines.shift(); // Remove first line {}
  const headers = lines.shift();
  
  if (!headers) {
    console.error('No headers found in file');
    process.exit(1);
  }
  
  const headerArray = headers.split('\t');
  
  // Print out the headers to help with debugging
  console.log("TXT Headers:", headerArray);
  
  // Create a map of header indices for faster lookup
  interface HeaderMap {
    name?: number;
    address_line1?: number;
    address_line2?: number;
    address_line3?: number;
    address_line4?: number;
    city?: number;
    state?: number;
    postcode?: number;
    contact_name?: number;
    phone?: number;
    email?: number;
    abn?: number;
  }
  
  const headerIndices: HeaderMap = {};
  headerArray.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();
    
    // Map the headers to our database fields
    if (normalized === 'co./last name') {
      headerIndices.name = index;
    }
    if (normalized === 'addr 1 - line 1') {
      headerIndices.address_line1 = index;
    }
    if (normalized === 'addr 1 - line 2') {
      headerIndices.address_line2 = index;
    }
    if (normalized === 'addr 1 - line 3') {
      headerIndices.address_line3 = index;
    }
    if (normalized === 'addr 1 - line 4') {
      headerIndices.address_line4 = index;
    }
    if (normalized === 'addr 1 - city') {
      headerIndices.city = index;
    }
    if (normalized === 'addr 1 - state') {
      headerIndices.state = index;
    }
    if (normalized === 'addr 1 - postcode') {
      headerIndices.postcode = index;
    }
    if (normalized === 'addr 1 - contact name') {
      headerIndices.contact_name = index;
    }
    if (normalized === 'addr 1 - phone no. 1') {
      headerIndices.phone = index;
    }
    if (normalized === 'addr 1 - email') {
      headerIndices.email = index;
    }
    if (normalized === 'a.b.n.') {
      headerIndices.abn = index;
    }
  });
  
  // Log the detected indices
  console.log("Detected field positions:", headerIndices);

  // Batch processing to avoid overloading the API
  const BATCH_SIZE = 20;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (line, index) => {
      try {
        if (!line.trim()) return; // Skip empty lines
        
        const values = line.split('\t');
        if (values.length < 5) return; // Skip invalid lines
        
        // Create a customer with mapped fields
        const customerData: Record<string, any> = {};
        
        // Extract name field
        if (headerIndices.name !== undefined) {
          customerData.name = values[headerIndices.name]?.trim() || 'No Name';
        }
        
        // Combine address fields
        const addressParts: string[] = [];
        if (headerIndices.address_line1 !== undefined && values[headerIndices.address_line1]?.trim()) {
          addressParts.push(values[headerIndices.address_line1].trim());
        }
        if (headerIndices.address_line2 !== undefined && values[headerIndices.address_line2]?.trim()) {
          addressParts.push(values[headerIndices.address_line2].trim());
        }
        if (headerIndices.address_line3 !== undefined && values[headerIndices.address_line3]?.trim()) {
          addressParts.push(values[headerIndices.address_line3].trim());
        }
        if (headerIndices.address_line4 !== undefined && values[headerIndices.address_line4]?.trim()) {
          addressParts.push(values[headerIndices.address_line4].trim());
        }
        if (headerIndices.city !== undefined && values[headerIndices.city]?.trim()) {
          addressParts.push(values[headerIndices.city].trim());
        }
        if (headerIndices.state !== undefined && values[headerIndices.state]?.trim()) {
          addressParts.push(values[headerIndices.state].trim());
        }
        if (headerIndices.postcode !== undefined && values[headerIndices.postcode]?.trim()) {
          addressParts.push(values[headerIndices.postcode].trim());
        }
        
        customerData.address = addressParts.join(', ') || 'No Address';
        
        // Extract contact name
        if (headerIndices.contact_name !== undefined) {
          customerData.primary_contact_name = values[headerIndices.contact_name]?.trim() || 'No Contact Name';
        }
        
        // Extract phone number
        if (headerIndices.phone !== undefined) {
          customerData.primary_contact_number = values[headerIndices.phone]?.trim() || 'No Phone Number';
        }
        
        // Extract email
        if (headerIndices.email !== undefined) {
          customerData.primary_email = values[headerIndices.email]?.trim() || 'No Email';
        }
        
        // Extract ABN (optional)
        if (headerIndices.abn !== undefined && values[headerIndices.abn]?.trim()) {
          customerData.abn = values[headerIndices.abn].trim();
        }
        
        // Ensure all required fields are present with default values if needed
        if (!customerData.name) customerData.name = 'No Name';
        if (!customerData.address) customerData.address = 'No Address';
        if (!customerData.primary_contact_name) customerData.primary_contact_name = 'No Contact Name';
        if (!customerData.primary_contact_number) customerData.primary_contact_number = 'No Phone Number';
        if (!customerData.primary_email) customerData.primary_email = 'No Email';
        
        // Create the document
        const result = await databases.createDocument(
          dbId,
          collectionId,
          ID.unique(),
          customerData
        );
        
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`Imported ${successCount} customers so far...`);
        }
      } catch (error) {
        console.error(`Error importing customer at line ${i + index}:`, error);
        errorCount++;
      }
    });
    
    await Promise.all(promises.filter(Boolean));
    console.log(`Processed batch ending at line ${i + BATCH_SIZE}`);
  }
  
  console.log(`Import completed. Successfully imported ${successCount} customers with ${errorCount} errors.`);
}

// Execute the import
importCustomersFromTxt()
  .then(() => {
    console.log('Import process completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during import process:', error);
    process.exit(1);
  }); 