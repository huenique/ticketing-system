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
const customersCollectionId = 'customers';
const contactsCollectionId = 'customer_contacts';

// Function to split a contact name into first and last name
function splitContactName(fullName: string): { firstName: string, lastName: string } {
  if (!fullName || fullName === 'No Contact Name') {
    return { firstName: 'Unknown', lastName: 'Contact' };
  }
  
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  
  // Handle names with multiple words
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  
  return { firstName, lastName };
}

// Helper function to parse phone numbers that may contain names
function parsePhoneWithName(phoneValue: string): { phone: string, name?: string } {
  if (!phoneValue) return { phone: '' };
  
  // Check if phone contains a name (common formats: "1234-5678 Name" or "1234-5678 - Name")
  if (phoneValue.includes(' - ')) {
    const [phone, name] = phoneValue.split(' - ', 2);
    return { phone: phone.trim(), name: name.trim() };
  } else if (phoneValue.includes(' ')) {
    // Try to identify if there's a name after the phone number
    const parts = phoneValue.split(' ');
    
    // If we have at least 2 parts and the first part looks like a phone number
    if (parts.length >= 2 && /^[\d\-+()]+$/.test(parts[0])) {
      return { 
        phone: parts[0].trim(), 
        name: parts.slice(1).join(' ').trim() 
      };
    }
  }
  
  return { phone: phoneValue.trim() };
}

// Function to process the TXT data and import to Appwrite
async function importCustomersFromTxt() {
  const filePath = path.resolve(__dirname, '../ATH_QLD_CUST.txt');
  console.log(`Reading file from: ${filePath}`);

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
    first_name?: number;
    address_line1?: number;
    address_line2?: number;
    address_line3?: number;
    address_line4?: number;
    city?: number;
    state?: number;
    postcode?: number;
    contact_name?: number;
    phone?: number;
    phone2?: number;
    phone3?: number;
    email?: number;
    abn?: number;
    www?: number;
    // For Address 2
    addr2_line1?: number;
    addr2_line2?: number;
    addr2_line3?: number;
    addr2_line4?: number;
    addr2_city?: number;
    addr2_state?: number;
    addr2_postcode?: number;
    addr2_contact_name?: number;
    addr2_phone?: number;
    addr2_email?: number;
    // For Address 3
    addr3_line1?: number;
    addr3_line2?: number;
    addr3_line3?: number;
    addr3_line4?: number;
    addr3_city?: number;
    addr3_state?: number;
    addr3_postcode?: number;
    addr3_contact_name?: number;
    addr3_phone?: number;
    addr3_email?: number;
    // For Address 4
    addr4_line1?: number;
    addr4_line2?: number;
    addr4_line3?: number;
    addr4_line4?: number;
    addr4_city?: number;
    addr4_state?: number;
    addr4_postcode?: number;
    addr4_contact_name?: number;
    addr4_phone?: number;
    addr4_email?: number;
    // For Address 5
    addr5_line1?: number;
    addr5_line2?: number;
    addr5_line3?: number;
    addr5_line4?: number;
    addr5_city?: number;
    addr5_state?: number;
    addr5_postcode?: number;
    addr5_contact_name?: number;
    addr5_phone?: number;
    addr5_email?: number;
  }
  
  const headerIndices: HeaderMap = {};
  headerArray.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();
    
    // Map the headers to our database fields
    if (normalized === 'co./last name') {
      headerIndices.name = index;
    }
    if (normalized === 'first name') {
      headerIndices.first_name = index;
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
    if (normalized === 'addr 1 - phone no. 2') {
      headerIndices.phone2 = index;
    }
    if (normalized === 'addr 1 - phone no. 3') {
      headerIndices.phone3 = index;
    }
    if (normalized === 'addr 1 - email') {
      headerIndices.email = index;
    }
    if (normalized === 'addr 1 - www') {
      headerIndices.www = index;
    }
    if (normalized === 'a.b.n.') {
      headerIndices.abn = index;
    }

    // Address 2 fields
    if (normalized === 'addr 2 - line 1') {
      headerIndices.addr2_line1 = index;
    }
    if (normalized === 'addr 2 - line 2') {
      headerIndices.addr2_line2 = index;
    }
    if (normalized === 'addr 2 - line 3') {
      headerIndices.addr2_line3 = index;
    }
    if (normalized === 'addr 2 - line 4') {
      headerIndices.addr2_line4 = index;
    }
    if (normalized === 'addr 2 - city') {
      headerIndices.addr2_city = index;
    }
    if (normalized === 'addr 2 - state') {
      headerIndices.addr2_state = index;
    }
    if (normalized === 'addr 2 - postcode') {
      headerIndices.addr2_postcode = index;
    }
    if (normalized === 'addr 2 - contact name') {
      headerIndices.addr2_contact_name = index;
    }
    if (normalized === 'addr 2 - phone no. 1') {
      headerIndices.addr2_phone = index;
    }
    if (normalized === 'addr 2 - email') {
      headerIndices.addr2_email = index;
    }

    // Address 3 fields
    if (normalized === 'addr 3 - line 1') {
      headerIndices.addr3_line1 = index;
    }
    if (normalized === 'addr 3 - contact name') {
      headerIndices.addr3_contact_name = index;
    }
    if (normalized === 'addr 3 - phone no. 1') {
      headerIndices.addr3_phone = index;
    }
    if (normalized === 'addr 3 - email') {
      headerIndices.addr3_email = index;
    }

    // Address 4 fields
    if (normalized === 'addr 4 - line 1') {
      headerIndices.addr4_line1 = index;
    }
    if (normalized === 'addr 4 - contact name') {
      headerIndices.addr4_contact_name = index;
    }
    if (normalized === 'addr 4 - phone no. 1') {
      headerIndices.addr4_phone = index;
    }
    if (normalized === 'addr 4 - email') {
      headerIndices.addr4_email = index;
    }

    // Address 5 fields
    if (normalized === 'addr 5 - line 1') {
      headerIndices.addr5_line1 = index;
    }
    if (normalized === 'addr 5 - contact name') {
      headerIndices.addr5_contact_name = index;
    }
    if (normalized === 'addr 5 - phone no. 1') {
      headerIndices.addr5_phone = index;
    }
    if (normalized === 'addr 5 - email') {
      headerIndices.addr5_email = index;
    }
  });
  
  // Log the detected indices
  console.log("Detected field positions:", headerIndices);

  // Batch processing to avoid overloading the API
  const BATCH_SIZE = 20;
  let successCount = 0;
  let errorCount = 0;
  let contactSuccessCount = 0;
  
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
        
        // Extract ABN (optional)
        if (headerIndices.abn !== undefined && values[headerIndices.abn]?.trim()) {
          customerData.abn = values[headerIndices.abn].trim();
        }
        
        // Ensure required fields are present with default values if needed
        if (!customerData.name) customerData.name = 'No Name';
        if (!customerData.address) customerData.address = 'No Address';
        
        // Create the customer document
        const customerId = ID.unique();
        const customerResult = await databases.createDocument(
          dbId,
          customersCollectionId,
          customerId,
          customerData
        );
        
        successCount++;
        
        // Process customer contacts
        const contactIds: string[] = [];
        
        // Helper function to create contact from address data
        const createContactFromAddressData = async (
          contactName?: string,
          contactPhone?: string,
          contactEmail?: string,
          position?: string
        ) => {
          if (!contactName || contactName === 'No Contact Name') return;
          
          try {
            const { firstName, lastName } = splitContactName(contactName);
            
            const contactData = {
              customer_ids: [customerId], // Many-to-Many relationship field
              first_name: firstName || 'Unknown',
              last_name: lastName || '',
              position: position || 'Contact',
              contact_number: contactPhone || 'No Phone Number',
              email: contactEmail || 'No Email'
            };
            
            const contactId = ID.unique();
            await databases.createDocument(
              dbId,
              contactsCollectionId,
              contactId,
              contactData
            );
            
            contactIds.push(contactId);
            contactSuccessCount++;
          } catch (error) {
            console.error(`Error creating contact for ${contactName}:`, error);
          }
        };
        
        // Get primary contact info for position assignment
        const primaryContactName = headerIndices.contact_name !== undefined ? 
          values[headerIndices.contact_name]?.trim() : '';
        
        // Process contacts from Address 1
        if (
          headerIndices.contact_name !== undefined && 
          values[headerIndices.contact_name]?.trim()
        ) {
          const contactName = values[headerIndices.contact_name]?.trim();
          let contactPhone = headerIndices.phone !== undefined ? values[headerIndices.phone]?.trim() : '';
          const contactEmail = headerIndices.email !== undefined ? values[headerIndices.email]?.trim() : '';
          
          // Parse phone number that might contain a name
          const parsedPhone = parsePhoneWithName(contactPhone);
          contactPhone = parsedPhone.phone;
          
          if (contactName) {
            await createContactFromAddressData(
              contactName,
              contactPhone,
              contactEmail,
              'Primary Contact'
            );
          }
        }
        
        // Process phone fields that might contain names as separate contacts
        if (headerIndices.phone !== undefined && values[headerIndices.phone]?.trim()) {
          const phoneValue = values[headerIndices.phone]?.trim();
          const parsedPhone = parsePhoneWithName(phoneValue);
          
          // If we found a name in the phone field, create a contact for it
          if (parsedPhone.name && parsedPhone.name.length > 1) {
            // Check if this phone-derived contact matches the primary contact
            const isPrimary = primaryContactName && 
              (primaryContactName.includes(parsedPhone.name) || 
               parsedPhone.name.includes(primaryContactName));
            
            await createContactFromAddressData(
              parsedPhone.name,
              parsedPhone.phone,
              '',
              isPrimary ? 'Primary Contact' : 'Contact'
            );
          }
        }
        
        // Process contacts from Address 2
        if (
          headerIndices.addr2_contact_name !== undefined && 
          values[headerIndices.addr2_contact_name]?.trim()
        ) {
          const contactName = values[headerIndices.addr2_contact_name]?.trim();
          let contactPhone = headerIndices.addr2_phone !== undefined ? values[headerIndices.addr2_phone]?.trim() : '';
          const contactEmail = headerIndices.addr2_email !== undefined ? values[headerIndices.addr2_email]?.trim() : '';
          
          // Parse phone number that might contain a name
          const parsedPhone = parsePhoneWithName(contactPhone);
          contactPhone = parsedPhone.phone;
          
          if (contactName) {
            await createContactFromAddressData(
              contactName,
              contactPhone,
              contactEmail,
              'Contact'
            );
          }
        }
        
        // Process Address 2 phone fields that might contain names
        if (headerIndices.addr2_phone !== undefined && values[headerIndices.addr2_phone]?.trim()) {
          const phoneValue = values[headerIndices.addr2_phone]?.trim();
          const parsedPhone = parsePhoneWithName(phoneValue);
          
          // If we found a name in the phone field, create a contact for it
          if (parsedPhone.name && parsedPhone.name.length > 1) {
            // Check if this phone-derived contact matches the primary contact
            const isPrimary = primaryContactName && 
              (primaryContactName.includes(parsedPhone.name) || 
               parsedPhone.name.includes(primaryContactName));
            
            await createContactFromAddressData(
              parsedPhone.name,
              parsedPhone.phone,
              '',
              isPrimary ? 'Primary Contact' : 'Contact'
            );
          }
        }
        
        // Process contacts from Address 3
        if (
          headerIndices.addr3_contact_name !== undefined && 
          values[headerIndices.addr3_contact_name]?.trim()
        ) {
          const contactName = values[headerIndices.addr3_contact_name]?.trim();
          let contactPhone = headerIndices.addr3_phone !== undefined ? values[headerIndices.addr3_phone]?.trim() : '';
          const contactEmail = headerIndices.addr3_email !== undefined ? values[headerIndices.addr3_email]?.trim() : '';
          
          // Parse phone number that might contain a name
          const parsedPhone = parsePhoneWithName(contactPhone);
          contactPhone = parsedPhone.phone;
          
          if (contactName) {
            await createContactFromAddressData(
              contactName,
              contactPhone,
              contactEmail,
              'Contact'
            );
          }
        }
        
        // Process Address 3 phone fields that might contain names
        if (headerIndices.addr3_phone !== undefined && values[headerIndices.addr3_phone]?.trim()) {
          const phoneValue = values[headerIndices.addr3_phone]?.trim();
          const parsedPhone = parsePhoneWithName(phoneValue);
          
          // If we found a name in the phone field, create a contact for it
          if (parsedPhone.name && parsedPhone.name.length > 1) {
            // Check if this phone-derived contact matches the primary contact
            const isPrimary = primaryContactName && 
              (primaryContactName.includes(parsedPhone.name) || 
               parsedPhone.name.includes(primaryContactName));
            
            await createContactFromAddressData(
              parsedPhone.name,
              parsedPhone.phone,
              '',
              isPrimary ? 'Primary Contact' : 'Contact'
            );
          }
        }
        
        // Process contacts from Address 4
        if (
          headerIndices.addr4_contact_name !== undefined && 
          values[headerIndices.addr4_contact_name]?.trim()
        ) {
          const contactName = values[headerIndices.addr4_contact_name]?.trim();
          let contactPhone = headerIndices.addr4_phone !== undefined ? values[headerIndices.addr4_phone]?.trim() : '';
          const contactEmail = headerIndices.addr4_email !== undefined ? values[headerIndices.addr4_email]?.trim() : '';
          
          // Parse phone number that might contain a name
          const parsedPhone = parsePhoneWithName(contactPhone);
          contactPhone = parsedPhone.phone;
          
          if (contactName) {
            await createContactFromAddressData(
              contactName,
              contactPhone,
              contactEmail,
              'Contact'
            );
          }
        }
        
        // Process Address 4 phone fields that might contain names
        if (headerIndices.addr4_phone !== undefined && values[headerIndices.addr4_phone]?.trim()) {
          const phoneValue = values[headerIndices.addr4_phone]?.trim();
          const parsedPhone = parsePhoneWithName(phoneValue);
          
          // If we found a name in the phone field, create a contact for it
          if (parsedPhone.name && parsedPhone.name.length > 1) {
            // Check if this phone-derived contact matches the primary contact
            const isPrimary = primaryContactName && 
              (primaryContactName.includes(parsedPhone.name) || 
               parsedPhone.name.includes(primaryContactName));
            
            await createContactFromAddressData(
              parsedPhone.name,
              parsedPhone.phone,
              '',
              isPrimary ? 'Primary Contact' : 'Contact'
            );
          }
        }
        
        // Process contacts from Address 5
        if (
          headerIndices.addr5_contact_name !== undefined && 
          values[headerIndices.addr5_contact_name]?.trim()
        ) {
          const contactName = values[headerIndices.addr5_contact_name]?.trim();
          let contactPhone = headerIndices.addr5_phone !== undefined ? values[headerIndices.addr5_phone]?.trim() : '';
          const contactEmail = headerIndices.addr5_email !== undefined ? values[headerIndices.addr5_email]?.trim() : '';
          
          // Parse phone number that might contain a name
          const parsedPhone = parsePhoneWithName(contactPhone);
          contactPhone = parsedPhone.phone;
          
          if (contactName) {
            await createContactFromAddressData(
              contactName,
              contactPhone,
              contactEmail,
              'Contact'
            );
          }
        }
        
        // Process Address 5 phone fields that might contain names
        if (headerIndices.addr5_phone !== undefined && values[headerIndices.addr5_phone]?.trim()) {
          const phoneValue = values[headerIndices.addr5_phone]?.trim();
          const parsedPhone = parsePhoneWithName(phoneValue);
          
          // If we found a name in the phone field, create a contact for it
          if (parsedPhone.name && parsedPhone.name.length > 1) {
            // Check if this phone-derived contact matches the primary contact
            const isPrimary = primaryContactName && 
              (primaryContactName.includes(parsedPhone.name) || 
               parsedPhone.name.includes(primaryContactName));
            
            await createContactFromAddressData(
              parsedPhone.name,
              parsedPhone.phone,
              '',
              isPrimary ? 'Primary Contact' : 'Contact'
            );
          }
        }
        
        // Additional contacts from other phone numbers
        if (
          headerIndices.phone2 !== undefined && 
          values[headerIndices.phone2]?.trim()
        ) {
          const phoneValue = values[headerIndices.phone2]?.trim();
          const parsedPhone = parsePhoneWithName(phoneValue);
          
          // Create contact if we have a name, either from parsing or from the phone format "xxxx - Name"
          if (parsedPhone.name && parsedPhone.name.length > 1) {
            // Check if this phone-derived contact matches the primary contact
            const isPrimary = primaryContactName && 
              (primaryContactName.includes(parsedPhone.name) || 
               parsedPhone.name.includes(primaryContactName));
                            
            await createContactFromAddressData(
              parsedPhone.name,
              parsedPhone.phone,
              '',
              isPrimary ? 'Primary Contact' : 'Contact'
            );
          } else if (phoneValue.includes('-')) {
            const parts = phoneValue.split('-');
            if (parts.length >= 2) {
              const phone = parts[0].trim();
              const name = parts[1].trim();
              if (name && name.length > 1 && !/^\d+$/.test(name)) { // Ensure name isn't just numbers
                // Check if this phone-derived contact matches the primary contact
                const isPrimary = primaryContactName && 
                  (primaryContactName.includes(name) || 
                   name.includes(primaryContactName));
                                
                await createContactFromAddressData(
                  name, 
                  phone, 
                  '',
                  isPrimary ? 'Primary Contact' : 'Contact'
                );
              }
            }
          }
        }
        
        if (
          headerIndices.phone3 !== undefined && 
          values[headerIndices.phone3]?.trim()
        ) {
          const phoneValue = values[headerIndices.phone3]?.trim();
          const parsedPhone = parsePhoneWithName(phoneValue);
          
          // Create contact if we have a name, either from parsing or from the phone format "xxxx - Name"
          if (parsedPhone.name && parsedPhone.name.length > 1) {
            // Check if this phone-derived contact matches the primary contact
            const isPrimary = primaryContactName && 
              (primaryContactName.includes(parsedPhone.name) || 
               parsedPhone.name.includes(primaryContactName));
                            
            await createContactFromAddressData(
              parsedPhone.name,
              parsedPhone.phone,
              '',
              isPrimary ? 'Primary Contact' : 'Contact'
            );
          } else if (phoneValue.includes('-')) {
            const parts = phoneValue.split('-');
            if (parts.length >= 2) {
              const phone = parts[0].trim();
              const name = parts[1].trim();
              if (name && name.length > 1 && !/^\d+$/.test(name)) { // Ensure name isn't just numbers
                // Check if this phone-derived contact matches the primary contact
                const isPrimary = primaryContactName && 
                  (primaryContactName.includes(name) || 
                   name.includes(primaryContactName));
                                
                await createContactFromAddressData(
                  name, 
                  phone, 
                  '',
                  isPrimary ? 'Primary Contact' : 'Contact'
                );
              }
            }
          }
        }
        
        if (successCount % 50 === 0) {
          console.log(`Imported ${successCount} customers and ${contactSuccessCount} contacts so far...`);
        }
      } catch (error) {
        console.error(`Error importing customer at line ${i + index}:`, error);
        errorCount++;
      }
    });
    
    await Promise.all(promises.filter(Boolean));
    console.log(`Processed batch ending at line ${i + BATCH_SIZE}`);
  }
  
  console.log(`Import completed. Successfully imported ${successCount} customers with ${contactSuccessCount} contacts. Errors: ${errorCount}`);
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