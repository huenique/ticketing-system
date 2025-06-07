import { databases } from '../lib/appwrite';
import { ID, Models } from 'node-appwrite';

const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const collectionId = 'workflows';

export interface Workflow extends Models.Document {
  name: string;
}

export const workflowsService = {
  // Get all workflows
  async getAllWorkflows(): Promise<Workflow[]> {
    try {
      const response = await databases.listDocuments(dbId, collectionId);
      return response.documents as unknown as Workflow[];
    } catch (error) {
      console.error('Error fetching workflows:', error);
      throw error;
    }
  },

  // Create a new workflow
  async createWorkflow(name: string): Promise<Workflow> {
    try {
      const response = await databases.createDocument(dbId, collectionId, ID.unique(), {
        name,
      });
      return response as unknown as Workflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  },

  // Delete a workflow
  async deleteWorkflow(id: string): Promise<void> {
    try {
      await databases.deleteDocument(dbId, collectionId, id);
    } catch (error) {
      console.error('Error deleting workflow:', error);
      throw error;
    }
  },
}; 