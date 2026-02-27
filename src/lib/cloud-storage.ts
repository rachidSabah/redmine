/**
 * Cloud Storage Service for Synchro PM
 * Supports Vercel Blob, AWS S3, and Google Cloud Storage
 */

export interface StorageConfig {
  provider: 'vercel-blob' | 's3' | 'gcs' | 'local';
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  size?: number;
  mimeType?: string;
}

export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  key?: string;
}

/**
 * Storage Service
 */
export class StorageService {
  private config: StorageConfig;

  constructor(config?: StorageConfig) {
    this.config = config || this.getDefaultConfig();
  }

  private getDefaultConfig(): StorageConfig {
    // Default to Vercel Blob in production
    if (process.env.VERCEL === '1') {
      return { provider: 'vercel-blob' };
    }
    // Check for S3 config
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      return {
        provider: 's3',
        bucket: process.env.AWS_S3_BUCKET,
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    // Fallback to local
    return { provider: 'local' };
  }

  /**
   * Upload a file
   */
  async upload(
    file: File | Buffer,
    options: {
      filename?: string;
      folder?: string;
      mimeType?: string;
      metadata?: Record<string, string>;
      isPublic?: boolean;
    } = {}
  ): Promise<UploadResult> {
    try {
      switch (this.config.provider) {
        case 'vercel-blob':
          return await this.uploadToVercelBlob(file, options);
        case 's3':
          return await this.uploadToS3(file, options);
        case 'gcs':
          return await this.uploadToGCS(file, options);
        case 'local':
        default:
          return await this.uploadToLocal(file, options);
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload to Vercel Blob
   */
  private async uploadToVercelBlob(
    file: File | Buffer,
    options: { filename?: string; folder?: string; mimeType?: string; isPublic?: boolean }
  ): Promise<UploadResult> {
    try {
      // Vercel Blob uses the @vercel/blob package
      const { put } = await import('@vercel/blob');
      
      const filename = options.filename || this.generateFilename(
        file instanceof File ? file.name : 'file'
      );
      const key = options.folder ? `${options.folder}/${filename}` : filename;
      
      const body = file instanceof File ? file : new Blob([file]);
      
      const result = await put(key, body, {
        access: options.isPublic === false ? 'private' : 'public',
        addRandomSuffix: true,
        contentType: options.mimeType || (file instanceof File ? file.type : undefined),
      });

      return {
        success: true,
        url: result.url,
        key: result.pathname,
        size: file instanceof File ? file.size : (file as Buffer).length,
        mimeType: options.mimeType,
      };
    } catch (error: any) {
      // If @vercel/blob is not installed, fallback to local
      console.warn('Vercel Blob not available, falling back to local:', error.message);
      return this.uploadToLocal(file, options);
    }
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(
    file: File | Buffer,
    options: { filename?: string; folder?: string; mimeType?: string; isPublic?: boolean }
  ): Promise<UploadResult> {
    const filename = options.filename || this.generateFilename(
      file instanceof File ? file.name : 'file'
    );
    const key = options.folder ? `${options.folder}/${filename}` : filename;
    
    const body = file instanceof File 
      ? Buffer.from(await file.arrayBuffer()) 
      : file;

    // Using fetch to call S3 API directly (without AWS SDK)
    // This is a simplified implementation - use AWS SDK for full features
    const region = this.config.region || 'us-east-1';
    const bucket = this.config.bucket;
    
    if (!bucket) {
      return { success: false, error: 'S3 bucket not configured' };
    }

    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    
    try {
      // For simplicity, we'll use a presigned URL approach or direct upload
      // In production, use @aws-sdk/client-s3
      const response = await fetch(url, {
        method: 'PUT',
        body,
        headers: {
          'Content-Type': options.mimeType || 'application/octet-stream',
          'x-amz-acl': options.isPublic !== false ? 'public-read' : 'private',
        },
      });

      if (!response.ok) {
        throw new Error(`S3 upload failed: ${response.status}`);
      }

      return {
        success: true,
        url: url,
        key,
        size: body.length,
        mimeType: options.mimeType,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload to Google Cloud Storage (stub - implement with @google-cloud/storage)
   */
  private async uploadToGCS(
    file: File | Buffer,
    options: { filename?: string; folder?: string; mimeType?: string }
  ): Promise<UploadResult> {
    return { 
      success: false, 
      error: 'Google Cloud Storage not implemented. Use S3 or Vercel Blob.' 
    };
  }

  /**
   * Upload to local filesystem (fallback)
   */
  private async uploadToLocal(
    file: File | Buffer,
    options: { filename?: string; folder?: string; mimeType?: string }
  ): Promise<UploadResult> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { existsSync } = await import('fs');
    const path = await import('path');

    const filename = options.filename || this.generateFilename(
      file instanceof File ? file.name : 'file'
    );
    
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', options.folder || '');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    const buffer = file instanceof File 
      ? Buffer.from(await file.arrayBuffer()) 
      : file;

    await writeFile(filePath, buffer);

    const url = `/uploads/${options.folder ? options.folder + '/' : ''}${filename}`;

    return {
      success: true,
      url,
      key: filename,
      size: buffer.length,
      mimeType: options.mimeType || (file instanceof File ? file.type : undefined),
    };
  }

  /**
   * Delete a file
   */
  async delete(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      switch (this.config.provider) {
        case 'vercel-blob': {
          const { del } = await import('@vercel/blob');
          await del(key);
          return { success: true };
        }
        case 's3': {
          const region = this.config.region || 'us-east-1';
          const bucket = this.config.bucket;
          const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
          await fetch(url, { method: 'DELETE' });
          return { success: true };
        }
        case 'local': {
          const { unlink } = await import('fs/promises');
          const path = await import('path');
          const filePath = path.join(process.cwd(), 'public', 'uploads', key);
          await unlink(filePath);
          return { success: true };
        }
        default:
          return { success: false, error: 'Unknown storage provider' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a unique filename
   */
  private generateFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = originalName.split('.').pop() || 'bin';
    return `${timestamp}-${randomStr}.${ext}`;
  }

  /**
   * Get a signed URL for private files
   */
  async getSignedUrl(
    key: string, 
    expiresIn: number = 3600
  ): Promise<string> {
    // For Vercel Blob, private blobs have signed URLs
    // For S3, generate presigned URL
    // For local, just return the public URL
    if (this.config.provider === 'local') {
      return `/uploads/${key}`;
    }
    
    // Return the direct URL - in production, implement proper signed URLs
    return key;
  }

  /**
   * Check if file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'vercel-blob': {
          const { head } = await import('@vercel/blob');
          const result = await head(key);
          return !!result;
        }
        case 'local': {
          const { existsSync } = await import('fs');
          const path = await import('path');
          return existsSync(path.join(process.cwd(), 'public', 'uploads', key));
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Export helper for direct use
export async function uploadFile(
  file: File | Buffer,
  options?: {
    filename?: string;
    folder?: string;
    mimeType?: string;
    isPublic?: boolean;
  }
): Promise<UploadResult> {
  return storageService.upload(file, options);
}
