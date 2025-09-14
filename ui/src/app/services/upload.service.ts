/**
 * Upload Service
 * 
 * This service handles file upload functionality including:
 * - File validation and preparation
 * - Azure Storage integration with SAS tokens
 * - Upload progress tracking
 * - Drag and drop support
 * - Error handling and retry logic
 * 
 * @see https://learn.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-javascript
 * @see https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview
 */

import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { BlobServiceClient, BlockBlobClient, ContainerClient } from '@azure/storage-blob';
import {
    FileValidationResult,
    SASToken,
    UploadFile,
    UploadOptions,
    UploadProgress,
    UploadResult,
    UploadStats
} from '../models/upload.model';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, delay, map, retry, retryWhen, switchMap, tap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UploadService {
    private readonly apiUrl = environment.apiBaseUrl;
    private readonly containerName = environment.storageContainerName;
    private readonly maxFileSize = environment.maxFileSize;
    private readonly allowedFileTypes = environment.allowedFileTypes;

    // State management
    private filesSubject = new BehaviorSubject<UploadFile[]>([]);
    private isUploadingSubject = new BehaviorSubject<boolean>(false);
    private errorSubject = new BehaviorSubject<string | null>(null);
    private dragOverSubject = new BehaviorSubject<boolean>(false);

    // Public observables
    public files$ = this.filesSubject.asObservable();
    public isUploading$ = this.isUploadingSubject.asObservable();
    public error$ = this.errorSubject.asObservable();
    public dragOver$ = this.dragOverSubject.asObservable();

    // Azure Storage client
    private blobServiceClient: BlobServiceClient | null = null;

    constructor(private http: HttpClient) {
        this.initializeBlobServiceClient();
    }

    // ======================
    // Public Methods
    // ======================

    /**
     * Add files for upload
     * 
     * @param files - FileList or File array to add
     * @returns Observable<UploadFile[]> - Added files
     */
    addFiles(files: FileList | File[]): Observable<UploadFile[]> {
        const fileArray = Array.from(files);
        const validatedFiles: UploadFile[] = [];

        for (const file of fileArray) {
            const validation = this.validateFile(file);
            if (validation.valid) {
                const uploadFile = this.createUploadFile(file);
                validatedFiles.push(uploadFile);
            } else {
                console.warn(`File ${file.name} validation failed:`, validation.errors);
                this.setError(`File ${file.name} validation failed: ${validation.errors.join(', ')}`);
            }
        }

        if (validatedFiles.length > 0) {
            const currentFiles = this.filesSubject.value;
            this.filesSubject.next([...currentFiles, ...validatedFiles]);
        }

        return of(validatedFiles);
    }

    /**
     * Upload a single file
     * 
     * @param fileId - ID of the file to upload
     * @param options - Upload options
     * @returns Observable<UploadResult> - Upload result
     */
    uploadFile(fileId: string, options?: UploadOptions): Observable<UploadResult> {
        const file = this.getFileById(fileId);
        if (!file) {
            return throwError(() => new Error('File not found'));
        }

        this.updateFileStatus(fileId, 'uploading');
        this.setUploading(true);
        this.setError(null);

        // Get SAS token and upload
        return this.getSASToken().pipe(
            switchMap(sasToken => this.uploadToAzure(file, sasToken, options)),
            tap(result => {
                if (result.success) {
                    this.updateFileStatus(fileId, 'completed');
                    this.updateFileUrl(fileId, result.url);
                } else {
                    this.updateFileStatus(fileId, 'error', result.error);
                }
                this.setUploading(false);
            }),
            catchError(error => {
                this.updateFileStatus(fileId, 'error', error.message);
                this.setUploading(false);
                this.setError(error.message);
                return throwError(() => error);
            })
        );
    }

    /**
     * Upload all pending files
     * 
     * @returns Observable<UploadResult[]> - Upload results
     */
    uploadAllFiles(): Observable<UploadResult[]> {
        const pendingFiles = this.getPendingFiles();
        if (pendingFiles.length === 0) {
            return of([]);
        }

        this.setUploading(true);
        this.setError(null);

        // Upload files sequentially to avoid overwhelming the server
        const uploadObservables = pendingFiles.map(file =>
            this.uploadFile(file.id).pipe(
                catchError(error => {
                    console.error(`Failed to upload ${file.name}:`, error);
                    return of({
                        fileId: file.id,
                        success: false,
                        error: error.message
                    } as UploadResult);
                })
            )
        );

        return from(uploadObservables).pipe(
            switchMap(obs => obs),
            tap(() => this.setUploading(false))
        );
    }

    /**
     * Remove a file from the upload queue
     * 
     * @param fileId - ID of the file to remove
     */
    removeFile(fileId: string): void {
        const currentFiles = this.filesSubject.value;
        const updatedFiles = currentFiles.filter(file => file.id !== fileId);
        this.filesSubject.next(updatedFiles);
    }

    /**
     * Clear all files
     */
    clearFiles(): void {
        this.filesSubject.next([]);
        this.setError(null);
    }

    /**
     * Retry failed uploads
     * 
     * @returns Observable<UploadResult[]> - Retry results
     */
    retryFailedUploads(): Observable<UploadResult[]> {
        const failedFiles = this.getFailedFiles();
        if (failedFiles.length === 0) {
            return of([]);
        }

        // Reset failed files to pending
        failedFiles.forEach(file => {
            this.updateFileStatus(file.id, 'pending');
            this.updateFileError(file.id, undefined);
        });

        return this.uploadAllFiles();
    }

    // ======================
    // Drag and Drop Methods
    // ======================

    /**
     * Handle drag over event
     */
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOverSubject.next(true);
    }

    /**
     * Handle drag leave event
     */
    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.dragOverSubject.next(false);
    }

    /**
     * Handle drop event
     * 
     * @param event - Drop event
     * @returns Observable<UploadFile[]> - Dropped files
     */
    onDrop(event: DragEvent): Observable<UploadFile[]> {
        event.preventDefault();
        event.stopPropagation();
        this.dragOverSubject.next(false);

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            return this.addFiles(files);
        }

        return of([]);
    }

    // ======================
    // Private Methods
    // ======================

    /**
     * Initialize Azure Blob Service Client
     */
    private initializeBlobServiceClient(): void {
        // In a real application, you would get these from environment variables
        // or from a secure configuration service
        const connectionString = environment.storageAccountKey;

        if (connectionString) {
            this.blobServiceClient = new BlobServiceClient(connectionString);
        }
    }

    /**
     * Create an UploadFile object from a File
     */
    private createUploadFile(file: File): UploadFile {
        return {
            id: this.generateId(),
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified),
            status: 'pending',
            progress: 0
        };
    }

    /**
     * Validate a file before upload
     */
    private validateFile(file: File): FileValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check file size
        if (file.size > this.maxFileSize) {
            errors.push(`File size exceeds maximum allowed size of ${this.formatFileSize(this.maxFileSize)}`);
        }

        // Check file type
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!this.allowedFileTypes.includes(fileExtension)) {
            errors.push(`File type ${fileExtension} is not allowed. Allowed types: ${this.allowedFileTypes.join(', ')}`);
        }

        // Check file name
        if (file.name.length > 255) {
            errors.push('File name is too long (maximum 255 characters)');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get SAS token for Azure Storage
     */
    private getSASToken(): Observable<SASToken> {
        return this.http.post<SASToken>(`${this.apiUrl}/sas-token`, {
            containerName: this.containerName,
            permissions: 'rw' // read and write permissions
        }).pipe(
            catchError(error => {
                console.error('Failed to get SAS token:', error);
                return throwError(() => new Error('Failed to get upload permissions'));
            })
        );
    }

    /**
     * Upload file to Azure Storage using SAS token
     */
    private uploadToAzure(
        uploadFile: UploadFile,
        sasToken: SASToken,
        options?: UploadOptions
    ): Observable<UploadResult> {
        return new Observable(observer => {
            const blobName = options?.blobName || `${Date.now()}-${uploadFile.name}`;
            const containerClient = new ContainerClient(sasToken.url);
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            // Set up progress tracking
            const progressCallback = (progress: any) => {
                const percentage = Math.round((progress.loadedBytes / progress.totalBytes) * 100);
                this.updateFileProgress(uploadFile.id, percentage);
            };

            // Upload options
            const uploadOptions = {
                blobHTTPHeaders: {
                    blobContentType: uploadFile.type
                },
                metadata: options?.metadata || {},
                tags: options?.tags || {},
                onProgress: progressCallback
            };

            // Perform upload
            blockBlobClient.uploadData(uploadFile.file, uploadOptions)
                .then(() => {
                    const result: UploadResult = {
                        fileId: uploadFile.id,
                        success: true,
                        url: blockBlobClient.url,
                        message: 'File uploaded successfully'
                    };
                    observer.next(result);
                    observer.complete();
                })
                .catch(error => {
                    const result: UploadResult = {
                        fileId: uploadFile.id,
                        success: false,
                        error: error.message
                    };
                    observer.error(result);
                });
        });
    }

    /**
     * Get file by ID
     */
    private getFileById(fileId: string): UploadFile | undefined {
        return this.filesSubject.value.find(file => file.id === fileId);
    }

    /**
     * Get pending files
     */
    private getPendingFiles(): UploadFile[] {
        return this.filesSubject.value.filter(file => file.status === 'pending');
    }

    /**
     * Get failed files
     */
    private getFailedFiles(): UploadFile[] {
        return this.filesSubject.value.filter(file => file.status === 'error');
    }

    /**
     * Update file status
     */
    private updateFileStatus(fileId: string, status: UploadStatus, error?: string): void {
        const files = this.filesSubject.value;
        const fileIndex = files.findIndex(file => file.id === fileId);

        if (fileIndex !== -1) {
            files[fileIndex] = {
                ...files[fileIndex],
                status,
                error
            };
            this.filesSubject.next([...files]);
        }
    }

    /**
     * Update file progress
     */
    private updateFileProgress(fileId: string, progress: number): void {
        const files = this.filesSubject.value;
        const fileIndex = files.findIndex(file => file.id === fileId);

        if (fileIndex !== -1) {
            files[fileIndex] = {
                ...files[fileIndex],
                progress
            };
            this.filesSubject.next([...files]);
        }
    }

    /**
     * Update file URL
     */
    private updateFileUrl(fileId: string, url?: string): void {
        const files = this.filesSubject.value;
        const fileIndex = files.findIndex(file => file.id === fileId);

        if (fileIndex !== -1) {
            files[fileIndex] = {
                ...files[fileIndex],
                url
            };
            this.filesSubject.next([...files]);
        }
    }

    /**
     * Update file error
     */
    private updateFileError(fileId: string, error?: string): void {
        const files = this.filesSubject.value;
        const fileIndex = files.findIndex(file => file.id === fileId);

        if (fileIndex !== -1) {
            files[fileIndex] = {
                ...files[fileIndex],
                error
            };
            this.filesSubject.next([...files]);
        }
    }

    /**
     * Set uploading state
     */
    private setUploading(uploading: boolean): void {
        this.isUploadingSubject.next(uploading);
    }

    /**
     * Set error state
     */
    private setError(error: string | null): void {
        this.errorSubject.next(error);
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Format file size for display
     */
    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ======================
    // Utility Methods
    // ======================

    /**
     * Get upload statistics
     */
    getUploadStats(): UploadStats {
        const files = this.filesSubject.value;
        const totalFiles = files.length;
        const completedFiles = files.filter(f => f.status === 'completed').length;
        const failedFiles = files.filter(f => f.status === 'error').length;
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        const uploadedSize = files
            .filter(f => f.status === 'completed')
            .reduce((sum, f) => sum + f.size, 0);

        return {
            totalFiles,
            completedFiles,
            failedFiles,
            totalSize,
            uploadedSize,
            averageSpeed: 0 // TODO: Calculate average speed
        };
    }

    /**
     * Check if drag and drop is supported
     */
    isDragDropSupported(): boolean {
        return environment.enableDragDrop && 'draggable' in document.createElement('div');
    }
}
