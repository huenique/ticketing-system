import { databases, Query } from "@/lib/appwrite";

/**
 * Utility script to create fulltext indices for search functionality
 * 
 * This script creates fulltext indices on specific fields in Appwrite collections
 * to enable server-side search functionality.
 * 
 * IMPORTANT: This script should be run by an administrator with appropriate permissions
 * in the Appwrite console or using the Appwrite CLI.
 * 
 * The following command can be used in Appwrite CLI:
 * 
 * ```
 * appwrite databases createIndex \
 *   --databaseId='YOUR_DATABASE_ID' \
 *   --collectionId='customers' \
 *   --key='customers_name_fulltext' \
 *   --type='fulltext' \
 *   --attributes='["name"]'
 * ```
 */

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

/**
 * Setup instructions for fulltext search
 * 
 * This function returns instructions for setting up fulltext search.
 * Since creating indices requires admin privileges, we provide the steps
 * rather than attempting to create indices programmatically.
 */
export function getSearchSetupInstructions() {
  return {
    title: "Setup Fulltext Search",
    message: "To enable server-side search, you need to create fulltext indices in Appwrite.",
    steps: [
      "1. Log in to your Appwrite Console",
      "2. Select your project and navigate to Databases",
      `3. Open the database with ID: ${DATABASE_ID}`,
      "4. Select the 'customers' collection",
      "5. Go to the 'Indexes' tab",
      "6. Click 'Create Index'",
      "7. Set Key to 'customers_name_fulltext'",
      "8. Set Type to 'Fulltext'",
      "9. Select the 'name' attribute",
      "10. Save the index"
    ],
    cli_command: `appwrite databases createIndex --databaseId='${DATABASE_ID}' --collectionId='customers' --key='customers_name_fulltext' --type='fulltext' --attributes='["name"]'`
  };
}

/**
 * Check if a collection has fulltext search capability
 * 
 * This function is a temporary workaround to check if search might work.
 * It attempts a search operation and catches the specific error about missing
 * fulltext indices if they don't exist.
 */
export async function checkFulltextSearchCapability(collectionId: string, field: string = "name") {
  try {
    // Try to perform a search with an empty string (shouldn't return results but also
    // shouldn't fail if the index exists)
    await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      [Query.search(field, "test")]
    );
    return { 
      hasFulltextIndex: true,
      message: `Fulltext search on ${collectionId}.${field} is available.`
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("fulltext index")) {
      return { 
        hasFulltextIndex: false,
        message: `Fulltext search on ${collectionId}.${field} requires a fulltext index.`,
        error: error.message
      };
    }
    // Other error occurred
    return { 
      hasFulltextIndex: false,
      message: "Error checking fulltext search capability.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export default { getSearchSetupInstructions, checkFulltextSearchCapability }; 