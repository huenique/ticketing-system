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
const collectionId = 'parts';

// Field mapping from CSV to database
const fieldMapping = {
  description: 'description',
  quantity: 'reorder_quantity',
  price: 'selling_price',
  vendor: 'primary_supplier'
};

// Function to ensure the parts collection exists
async function ensurePartsCollectionExists() {
  try {
    // Check if collection exists by trying to get it
    await databases.getCollection(dbId, collectionId);
    console.log('Parts collection already exists');
  } catch (error: any) {
    // Create collection if it doesn't exist
    if (error.code === 404) {
      console.log('Creating parts collection...');
      
      await databases.createCollection(
        dbId,
        collectionId,
        'Parts',
        ['read("any")', 'create("any")', 'update("any")', 'delete("any")']
      );

      // Add attributes based on the required schema
      await databases.createStringAttribute(dbId, collectionId, 'description', 500, true);
      await databases.createStringAttribute(dbId, collectionId, 'quantity', 50, true);
      await databases.createStringAttribute(dbId, collectionId, 'price', 50, true);
      await databases.createStringAttribute(dbId, collectionId, 'vendor', 255, true);
      
      // Timestamps are automatically managed by Appwrite
      // No need to add them manually
      
      console.log('Parts collection and attributes created successfully');
    } else {
      console.error('Error checking collection:', error);
      process.exit(1);
    }
  }
}

// Function to process the CSV data and import to Appwrite
async function importPartsFromCSV() {
  const filePath = path.resolve(__dirname, '../ITEM20250505 1.TXT');
  console.log(`Reading file from: ${filePath}`);

  // Ensure the collection exists before importing
  await ensurePartsCollectionExists();

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
  
  const headerArray = headers.split(',');
  
  // Print out the headers to help with debugging
  console.log("CSV Headers:", headerArray);
  
  // Create a map of header indices for faster lookup
  interface HeaderMap {
    description?: number;
    item_name?: number;
    reorder_quantity?: number;
    selling_price?: number;
    primary_supplier?: number;
  }
  
  const headerIndices: HeaderMap = {};
  headerArray.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();
    console.log(`Header ${index}: "${header}" -> "${normalized}"`);
    
    // Look for item_name instead of description
    if (normalized === 'item name') {
      headerIndices.item_name = index;
    }
    
    // Match Quantity field
    if (normalized.includes('reorder') || normalized === 'reorder quantity') {
      headerIndices.reorder_quantity = index;
    }
    
    // Match Price field - specifically look for "Selling Price"
    if (normalized === 'selling price') {
      headerIndices.selling_price = index;
    }
    
    // Match Vendor field
    if (normalized.includes('supplier') || normalized === 'primary supplier') {
      headerIndices.primary_supplier = index;
    }
  });
  
  // Log the detected indices
  console.log("Detected field positions:", headerIndices);

  // Check if we have all required fields
  const missingFields: string[] = [];
  if (headerIndices.item_name === undefined) missingFields.push('item_name');
  if (headerIndices.reorder_quantity === undefined) missingFields.push('reorder_quantity');
  if (headerIndices.selling_price === undefined) missingFields.push('selling_price');
  if (headerIndices.primary_supplier === undefined) missingFields.push('primary_supplier');

  if (missingFields.length > 0) {
    console.warn(`Warning: Missing some fields in CSV: ${missingFields.join(', ')}`);
    console.log('Available headers:', headerArray.join(', '));
  }

  // Batch processing to avoid overloading the API
  const BATCH_SIZE = 20;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (line, index) => {
      try {
        if (!line.trim()) return; // Skip empty lines
        
        const values = line.split(',');
        if (values.length < 5) return; // Skip invalid lines
        
        // Create a part with mapped fields
        const partData: Record<string, any> = {};
        
        // Map the fields according to the mapping
        if (headerIndices.item_name !== undefined) {
          partData.description = values[headerIndices.item_name] || 'No description';
        }
        
        if (headerIndices.reorder_quantity !== undefined) {
          partData.quantity = values[headerIndices.reorder_quantity] || '0';
        }
        
        if (headerIndices.selling_price !== undefined) {
          // Remove the $ symbol if present and clean the value
          const priceValue = values[headerIndices.selling_price];
          if (priceValue) {
            // Make sure to trim spaces and remove $ sign
            partData.price = priceValue.trim().replace('$', '');
            console.log(`Found price: "${priceValue}" -> "${partData.price}"`);
          } else {
            partData.price = '0';
          }
        }
        
        if (headerIndices.primary_supplier !== undefined) {
          partData.vendor = values[headerIndices.primary_supplier] || 'Unknown vendor';
        }
        
        // Ensure all required fields are present with default values if needed
        if (!partData.description) partData.description = 'No description';
        if (!partData.quantity) partData.quantity = '0';
        if (!partData.price) partData.price = '0';
        if (!partData.vendor) partData.vendor = 'Unknown vendor';
        
        // Create the document
        const result = await databases.createDocument(
          dbId,
          collectionId,
          ID.unique(),
          partData
        );
        
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`Imported ${successCount} parts so far...`);
        }
      } catch (error) {
        console.error(`Error importing part at line ${i + index}:`, error);
        errorCount++;
      }
    });
    
    await Promise.all(promises.filter(Boolean));
    console.log(`Processed batch ending at line ${i + BATCH_SIZE}`);
  }
  
  console.log(`Import completed. Successfully imported ${successCount} parts with ${errorCount} errors.`);
}

// Execute the import
importPartsFromCSV()
  .then(() => {
    console.log('Import process completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during import process:', error);
    process.exit(1);
  }); 