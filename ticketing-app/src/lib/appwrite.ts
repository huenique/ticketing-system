/**
 * Appwrite API Client
 * Provides modular functions to interact with Appwrite backend
 */

// Retrieve environment variables
const API_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = import.meta.env.VITE_APPWRITE_API_KEY;

// Default headers
const getHeaders = () => ({
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
  'Content-Type': 'application/json',
});

/**
 * Generic fetch function for Appwrite API
 */
async function appwriteFetch<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: object
): Promise<T> {
  const url = `${API_ENDPOINT}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: getHeaders(),
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error('Appwrite API request failed:', error);
    throw error;
  }
}

/**
 * Get all documents from a collection
 */
export async function getCollection<T>(collectionId: string): Promise<{ documents: T[] }> {
  return appwriteFetch<{ documents: T[] }>(
    `/databases/${DATABASE_ID}/collections/${collectionId}/documents`
  );
}

/**
 * Get a single document by ID
 */
export async function getDocument<T>(collectionId: string, documentId: string): Promise<T> {
  return appwriteFetch<T>(
    `/databases/${DATABASE_ID}/collections/${collectionId}/documents/${documentId}`
  );
}

/**
 * Create a new document
 */
export async function createDocument<T>(
  collectionId: string, 
  data: object
): Promise<T> {
  return appwriteFetch<T>(
    `/databases/${DATABASE_ID}/collections/${collectionId}/documents`,
    'POST',
    data
  );
}

/**
 * Update an existing document
 */
export async function updateDocument<T>(
  collectionId: string,
  documentId: string,
  data: object
): Promise<T> {
  return appwriteFetch<T>(
    `/databases/${DATABASE_ID}/collections/${collectionId}/documents/${documentId}`,
    'PUT',
    data
  );
}

/**
 * Delete a document
 */
export async function deleteDocument(
  collectionId: string,
  documentId: string
): Promise<void> {
  return appwriteFetch<void>(
    `/databases/${DATABASE_ID}/collections/${collectionId}/documents/${documentId}`,
    'DELETE'
  );
} 