import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';
import path from 'path';

/**
 * Google Cloud Storage Service for Tribal Gnosis Platform
 */

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

export class GoogleCloudStorageService {
  private storage: Storage;
  private bucketName: string;
  private bucket: any;

  constructor(config: StorageConfig) {
    // Initialize Google Cloud Storage
    if (config.keyFilename) {
      this.storage = new Storage({
        projectId: config.projectId,
        keyFilename: config.keyFilename,
      });
    } else {
      // Use environment variable for service account
      this.storage = new Storage({
        projectId: config.projectId,
      });
    }
    
    this.bucketName = config.bucketName;
    this.bucket = this.storage.bucket(this.bucketName);
  }

  /**
   * Initialize and verify bucket exists
   */
  async initializeBucket(): Promise<void> {
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        console.log(`Creating bucket: ${this.bucketName}`);
        await this.bucket.create();
      }
      console.log(`Google Cloud Storage initialized: ${this.bucketName}`);
    } catch (error) {
      console.error('Error initializing bucket:', error);
      throw error;
    }
  }

  /**
   * Upload file to Google Cloud Storage
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    contentType: string,
    tenantId: string,
    category: string = 'documents'
  ): Promise<FileUploadResult> {
    try {
      // Generate unique filename with tenant isolation
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      const fileName = `${tenantId}/${category}/${timestamp}-${randomString}-${baseName}${extension}`;

      const file = this.bucket.file(fileName);
      
      // Set metadata
      const metadata = {
        contentType: contentType || 'application/octet-stream',
        metadata: {
          tenantId,
          originalName,
          category,
          uploadedAt: new Date().toISOString()
        }
      };

      // Upload the file
      const stream = file.createWriteStream({
        metadata: metadata,
        resumable: false // For files < 5MB, non-resumable is faster
      });

      return new Promise((resolve, reject) => {
        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);

        readable.pipe(stream)
          .on('error', (error) => {
            console.error('Error uploading file:', error);
            reject(error);
          })
          .on('finish', async () => {
            try {
              const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
              
              resolve({
                fileName: originalName,
                filePath: fileName,
                publicUrl,
                size: buffer.length,
                contentType: contentType || 'application/octet-stream',
                tenantId
              });
            } catch (error) {
              reject(error);
            }
          });
      });
    } catch (error) {
      console.error('Error in uploadFile:', error);
      throw error;
    }
  }

  /**
   * Download file from Google Cloud Storage
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const file = this.bucket.file(filePath);
      const [buffer] = await file.download();
      return buffer;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Delete file from Google Cloud Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const file = this.bucket.file(filePath);
      await file.delete();
      console.log(`File deleted: ${filePath}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get total storage usage across all tenants
   */
  async getTotalStorageUsed(): Promise<number> {
    try {
      const [files] = await this.bucket.getFiles();
      
      let totalSize = 0;
      for (const file of files) {
        const size = parseInt(file.metadata.size || '0');
        totalSize += size;
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error getting total storage usage:', error);
      return 0;
    }
  }

  /**
   * Get storage usage for specific tenant
   */
  async getStorageUsage(tenantId: string): Promise<number> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `${tenantId}/`
      });
      
      let totalSize = 0;
      for (const file of files) {
        const size = parseInt(file.metadata.size || '0');
        totalSize += size;
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return 0;
    }
  }

  /**
   * List files for a tenant
   */
  async listFiles(tenantId: string): Promise<any[]> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `${tenantId}/`
      });
      
      return files.map(file => ({
        name: file.name,
        size: file.metadata.size,
        timeCreated: file.metadata.timeCreated,
        contentType: file.metadata.contentType,
        publicUrl: `https://storage.googleapis.com/${this.bucketName}/${file.name}`
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }
}

// Export singleton instance
const storageConfig: StorageConfig = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // Optional: path to service account key
  bucketName: process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'tribal-gnosis-storage',
};

export const cloudStorageService = new GoogleCloudStorageService(storageConfig);