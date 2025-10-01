// Placeholder Google Cloud Storage Service
// Note: Install @google-cloud/storage package to enable full functionality

export interface FileUploadResult {
  fileName: string;
  filePath: string;
  publicUrl: string;
  size: number;
  contentType: string;
  tenantId: string;
}

export interface StorageConfig {
  projectId: string;
  keyFilename?: string;
  bucketName: string;
}

// Placeholder service until Google Cloud Storage package is installed
export const cloudStorageService = {
  uploadFile: async (): Promise<FileUploadResult> => {
    throw new Error('Google Cloud Storage not configured. Install @google-cloud/storage package.');
  },
  downloadFile: async (): Promise<Buffer> => {
    throw new Error('Google Cloud Storage not configured. Install @google-cloud/storage package.');
  },
  deleteFile: async (): Promise<void> => {
    throw new Error('Google Cloud Storage not configured. Install @google-cloud/storage package.');
  },
  getTotalStorageUsed: async (): Promise<number> => {
    console.warn('Google Cloud Storage not configured, returning 0 storage usage');
    return 0;
  }
};