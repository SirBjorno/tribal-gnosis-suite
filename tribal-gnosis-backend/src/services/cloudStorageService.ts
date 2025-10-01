import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';
import path from 'path';

/**
 * Google Cloud Storage Service
 * 
 * This service handles file storage, retrieval, and management
 * for the Tribal Gnosis platform using Google Cloud Storage.
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

  constructor(config: StorageConfig) {
    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.keyFilename, // Path to service account key file
    });
    this.bucketName = config.bucketName;
  }

  /**
   * Initialize the storage bucket with proper configuration
   */
  async initializeBucket(): Promise<void> {
    try {
      const [bucket] = await this.storage.bucket(this.bucketName).get({ autoCreate: true });
      
      // Set CORS configuration for web access
      await bucket.setCorsConfiguration([
        {
          maxAgeSeconds: 3600,
          method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
          origin: ['https://tribal-gnosis-frontend.onrender.com', 'http://localhost:3000'],
          responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
        },
      ]);

      console.log(`Storage bucket ${this.bucketName} initialized successfully`);
    } catch (error) {
      console.error('Failed to initialize storage bucket:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Cloud Storage
   */
  async uploadFile(
    buffer: Buffer,
    originalName: string,
    contentType: string,
    tenantId: string,
    category: 'audio' | 'documents' | 'exports' | 'temp' = 'documents'
  ): Promise<FileUploadResult> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      const fileName = `${baseName}_${timestamp}${extension}`;
      
      // Create tenant-specific path
      const filePath = `tenants/${tenantId}/${category}/${fileName}`;
      
      // Get bucket and file reference
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      
      // Create upload stream
      const stream = file.createWriteStream({
        metadata: {
          contentType,
          metadata: {
            tenantId,
            category,
            originalName,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Upload the file
      return new Promise((resolve, reject) => {
        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);

        readable
          .pipe(stream)
          .on('error', (error) => {
            console.error('Upload error:', error);
            reject(error);
          })
          .on('finish', async () => {
            try {
              // Make file publicly readable (adjust based on your security requirements)
              await file.makePublic();
              
              const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filePath}`;
              
              resolve({
                fileName,
                filePath,
                publicUrl,
                size: buffer.length,
                contentType,
                tenantId,
              });
            } catch (error) {
              reject(error);
            }
          });
      });
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * Download a file from Google Cloud Storage
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const file = this.storage.bucket(this.bucketName).file(filePath);
      const [buffer] = await file.download();
      return buffer;
    } catch (error) {
      console.error('File download failed:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Google Cloud Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const file = this.storage.bucket(this.bucketName).file(filePath);
      await file.delete();
      console.log(`File ${filePath} deleted successfully`);
    } catch (error) {
      console.error('File deletion failed:', error);
      throw error;
    }
  }

  /**
   * List all files for a tenant
   */
  async listTenantFiles(tenantId: string): Promise<any[]> {
    try {
      const [files] = await this.storage.bucket(this.bucketName).getFiles({
        prefix: `tenants/${tenantId}/`,
      });

      return files.map(file => ({
        name: file.name,
        size: parseInt(file.metadata.size || '0'),
        contentType: file.metadata.contentType,
        created: file.metadata.timeCreated,
        updated: file.metadata.updated,
        publicUrl: `https://storage.googleapis.com/${this.bucketName}/${file.name}`,
        category: file.metadata.metadata?.category || 'unknown',
      }));
    } catch (error) {
      console.error('Failed to list tenant files:', error);
      throw error;
    }
  }

  /**
   * Get storage usage for a tenant
   */
  async getTenantStorageUsage(tenantId: string): Promise<{
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    totalSizeGB: number;
    breakdown: Record<string, { files: number; sizeBytes: number }>;
  }> {
    try {
      const files = await this.listTenantFiles(tenantId);
      
      let totalSizeBytes = 0;
      let totalFiles = 0;
      const breakdown: Record<string, { files: number; sizeBytes: number }> = {};

      for (const file of files) {
        totalFiles++;
        totalSizeBytes += file.size;
        
        const category = file.category;
        if (!breakdown[category]) {
          breakdown[category] = { files: 0, sizeBytes: 0 };
        }
        breakdown[category].files++;
        breakdown[category].sizeBytes += file.size;
      }

      return {
        totalFiles,
        totalSizeBytes,
        totalSizeMB: totalSizeBytes / 1024 / 1024,
        totalSizeGB: totalSizeBytes / 1024 / 1024 / 1024,
        breakdown,
      };
    } catch (error) {
      console.error('Failed to get tenant storage usage:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files older than specified hours
   */
  async cleanupTempFiles(hoursOld: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
      const [files] = await this.storage.bucket(this.bucketName).getFiles({
        prefix: 'tenants/',
      });

      let deletedCount = 0;
      
      for (const file of files) {
        if (file.name.includes('/temp/') && file.metadata.timeCreated) {
          const createdTime = new Date(file.metadata.timeCreated);
          if (createdTime < cutoffTime) {
            await file.delete();
            deletedCount++;
          }
        }
      }

      console.log(`Cleaned up ${deletedCount} temporary files`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup temporary files:', error);
      throw error;
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