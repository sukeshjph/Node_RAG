/**
 * Upload-related data models
 * 
 * This file contains TypeScript interfaces and types for file upload functionality,
 * including upload progress, file information, and Azure Storage integration.
 */

// ======================
// File Upload Models
// ======================

/**
 * Represents a file selected for upload
 */
export interface UploadFile {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    lastModified: Date;
    status: UploadStatus;
    progress: number;
    error?: string;
    url?: string;
}

/**
 * Represents the status of a file upload
 */
export type UploadStatus =
    | 'pending'
    | 'uploading'
    | 'completed'
    | 'error'
    | 'cancelled';

/**
 * Represents upload progress information
 */
export interface UploadProgress {
    fileId: string;
    loaded: number;
    total: number;
    percentage: number;
    speed: number; // bytes per second
    estimatedTimeRemaining: number; // seconds
}

/**
 * Represents the result of a file upload
 */
export interface UploadResult {
    fileId: string;
    success: boolean;
    url?: string;
    error?: string;
    message?: string;
}

// ======================
// Azure Storage Models
// ======================

/**
 * Represents SAS token information for Azure Storage
 */
export interface SASToken {
    token: string;
    url: string;
    expiresOn: Date;
    permissions: string;
}

/**
 * Represents Azure Storage configuration
 */
export interface StorageConfig {
    accountName: string;
    containerName: string;
    sasToken?: string;
    connectionString?: string;
}

/**
 * Represents upload options for Azure Storage
 */
export interface UploadOptions {
    blobName?: string;
    metadata?: Record<string, string>;
    tags?: Record<string, string>;
    overwrite?: boolean;
    onProgress?: (progress: UploadProgress) => void;
}

// ======================
// Upload State Models
// ======================

/**
 * Represents the current upload state
 */
export interface UploadState {
    files: UploadFile[];
    isUploading: boolean;
    totalProgress: number;
    error: string | null;
    dragOver: boolean;
}

/**
 * Represents upload statistics
 */
export interface UploadStats {
    totalFiles: number;
    completedFiles: number;
    failedFiles: number;
    totalSize: number;
    uploadedSize: number;
    averageSpeed: number;
}

// ======================
// File Validation Models
// ======================

/**
 * Represents file validation rules
 */
export interface FileValidationRules {
    maxSize: number;
    allowedTypes: string[];
    allowedExtensions: string[];
    maxFiles: number;
}

/**
 * Represents file validation result
 */
export interface FileValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// ======================
// Drag and Drop Models
// ======================

/**
 * Represents drag and drop state
 */
export interface DragDropState {
    isDragOver: boolean;
    dragCounter: number;
    draggedFiles: FileList | null;
}

/**
 * Represents drag and drop events
 */
export interface DragDropEvent {
    type: 'dragenter' | 'dragover' | 'dragleave' | 'drop';
    files: FileList | null;
    preventDefault: () => void;
    stopPropagation: () => void;
}
