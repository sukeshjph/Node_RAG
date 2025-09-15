/**
 * Upload Component
 * 
 * This component provides file upload functionality with drag and drop support.
 * It integrates with Azure Storage using SAS tokens and provides upload progress tracking.
 * 
 * Features:
 * - Drag and drop file upload
 * - File validation and preview
 * - Upload progress tracking
 * - Error handling and retry
 * - Multiple file support
 * - Azure Storage integration
 */

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FileValidationResult, UploadFile, UploadStats } from '../../models/upload.model';
import { Subject, takeUntil } from 'rxjs';

import { UploadService } from '../../services/upload.service';

@Component({
    selector: 'app-upload',
    templateUrl: './upload.component.html',
    styleUrls: ['./upload.component.scss']
})
export class UploadComponent implements OnInit, OnDestroy {
    @ViewChild('fileInput', { static: false }) fileInput!: ElementRef<HTMLInputElement>;

    // State
    files: UploadFile[] = [];
    isUploading = false;
    dragOver = false;
    error: string | null = null;
    uploadStats: UploadStats | null = null;

    // Destroy subject for cleanup
    private destroy$ = new Subject<void>();

    constructor(private uploadService: UploadService) { }

    ngOnInit(): void {
        this.initializeSubscriptions();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ======================
    // Public Methods
    // ======================

    /**
     * Handle file input change
     */
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            this.uploadService.addFiles(input.files).subscribe({
                next: (files) => {
                    console.log('Files added:', files);
                    this.updateUploadStats();
                },
                error: (error) => {
                    console.error('Failed to add files:', error);
                }
            });
        }

        // Reset input
        input.value = '';
    }

    /**
     * Handle drag over event
     */
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.uploadService.onDragOver(event);
    }

    /**
     * Handle drag leave event
     */
    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.uploadService.onDragLeave(event);
    }

    /**
     * Handle drop event
     */
    onDrop(event: DragEvent): void {
        this.uploadService.onDrop(event).subscribe({
            next: (files) => {
                console.log('Files dropped:', files);
                this.updateUploadStats();
            },
            error: (error) => {
                console.error('Failed to handle drop:', error);
            }
        });
    }

    /**
     * Upload all files
     */
    uploadAllFiles(): void {
        this.uploadService.uploadAllFiles().subscribe({
            next: (results) => {
                console.log('Upload completed:', results);
                this.updateUploadStats();
            },
            error: (error) => {
                console.error('Upload failed:', error);
            }
        });
    }

    /**
     * Upload a single file
     */
    uploadFile(fileId: string): void {
        this.uploadService.uploadFile(fileId).subscribe({
            next: (result) => {
                console.log('File uploaded:', result);
                this.updateUploadStats();
            },
            error: (error) => {
                console.error('File upload failed:', error);
            }
        });
    }

    /**
     * Remove a file
     */
    removeFile(fileId: string): void {
        this.uploadService.removeFile(fileId);
        this.updateUploadStats();
    }

    /**
     * Clear all files
     */
    clearFiles(): void {
        this.uploadService.clearFiles();
        this.updateUploadStats();
    }

    /**
     * Retry failed uploads
     */
    retryFailedUploads(): void {
        this.uploadService.retryFailedUploads().subscribe({
            next: (results) => {
                console.log('Retry completed:', results);
                this.updateUploadStats();
            },
            error: (error) => {
                console.error('Retry failed:', error);
            }
        });
    }

    /**
     * Open file picker
     */
    openFilePicker(): void {
        this.fileInput.nativeElement.click();
    }

    // ======================
    // Private Methods
    // ======================

    /**
     * Initialize component subscriptions
     */
    private initializeSubscriptions(): void {
        // Subscribe to files
        this.uploadService.files$
            .pipe(takeUntil(this.destroy$))
            .subscribe(files => {
                this.files = files;
            });

        // Subscribe to upload state
        this.uploadService.isUploading$
            .pipe(takeUntil(this.destroy$))
            .subscribe(uploading => {
                this.isUploading = uploading;
            });

        // Subscribe to drag over state
        this.uploadService.dragOver$
            .pipe(takeUntil(this.destroy$))
            .subscribe(dragOver => {
                this.dragOver = dragOver;
            });

        // Subscribe to errors
        this.uploadService.error$
            .pipe(takeUntil(this.destroy$))
            .subscribe(error => {
                this.error = error;
            });
    }

    /**
     * Update upload statistics
     */
    private updateUploadStats(): void {
        this.uploadStats = this.uploadService.getUploadStats();
    }

    // ======================
    // Template Helpers
    // ======================

    /**
     * Check if drag and drop is supported
     */
    isDragDropSupported(): boolean {
        return this.uploadService.isDragDropSupported();
    }

    /**
     * Get file status icon
     */
    getFileStatusIcon(file: UploadFile): string {
        switch (file.status) {
            case 'pending': return 'schedule';
            case 'uploading': return 'cloud_upload';
            case 'completed': return 'check_circle';
            case 'error': return 'error';
            case 'cancelled': return 'cancel';
            default: return 'help';
        }
    }

    /**
     * Get file status color
     */
    getFileStatusColor(file: UploadFile): string {
        switch (file.status) {
            case 'pending': return 'primary';
            case 'uploading': return 'accent';
            case 'completed': return 'primary';
            case 'error': return 'warn';
            case 'cancelled': return 'warn';
            default: return 'primary';
        }
    }

    /**
     * Format file size
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format upload progress
     */
    formatProgress(progress: number): string {
        return Math.round(progress) + '%';
    }

    /**
     * Check if file has error
     */
    hasError(file: UploadFile): boolean {
        return !!file.error;
    }

    /**
     * Check if file is uploading
     */
    isUploadingFile(file: UploadFile): boolean {
        return file.status === 'uploading';
    }

    /**
     * Check if file is completed
     */
    isCompletedFile(file: UploadFile): boolean {
        return file.status === 'completed';
    }

    /**
     * Check if file is pending
     */
    isPendingFile(file: UploadFile): boolean {
        return file.status === 'pending';
    }

    /**
     * Check if file has error status
     */
    isErrorFile(file: UploadFile): boolean {
        return file.status === 'error';
    }

    /**
     * Get files by status
     */
    getFilesByStatus(status: string): UploadFile[] {
        return this.files.filter(file => file.status === status);
    }

    /**
     * Check if there are any files
     */
    hasFiles(): boolean {
        return this.files.length > 0;
    }

    /**
     * Check if there are pending files
     */
    hasPendingFiles(): boolean {
        return this.getFilesByStatus('pending').length > 0;
    }

    /**
     * Check if there are failed files
     */
    hasFailedFiles(): boolean {
        return this.getFilesByStatus('error').length > 0;
    }

    /**
     * Check if there are completed files
     */
    hasCompletedFiles(): boolean {
        return this.getFilesByStatus('completed').length > 0;
    }

    /**
     * Get total upload progress
     */
    getTotalProgress(): number {
        if (this.files.length === 0) return 0;

        const totalProgress = this.files.reduce((sum, file) => sum + file.progress, 0);
        return Math.round(totalProgress / this.files.length);
    }

    /**
     * Track by function for ngFor
     */
    trackByFileId(index: number, file: UploadFile): string {
        return file.id;
    }

    /**
     * Get file type icon
     */
    getFileTypeIcon(file: UploadFile): string {
        const extension = file.name.split('.').pop()?.toLowerCase();

        switch (extension) {
            case 'pdf': return 'picture_as_pdf';
            case 'txt': return 'description';
            case 'doc': case 'docx': return 'description';
            case 'xls': case 'xlsx': return 'table_chart';
            case 'ppt': case 'pptx': return 'slideshow';
            case 'jpg': case 'jpeg': case 'png': case 'gif': return 'image';
            default: return 'insert_drive_file';
        }
    }
}
