type MultipartUploadCallbackReturnString = (response: any) => string;
type MultipartUploadCallbackReturnAny = (response: any) => any;

interface AWSMultipartUploadConstructorParams {
    host: string;
    initiateMultipartUploadEndpoint: string;
    preSignedUrlEndpoint: string;
    completeMultipartUploadEndpoint: string;
    chunkSize: number;
    initiateMultipartUploadCallback: MultipartUploadCallbackReturnString;
    getPreSignedUrlCallback: MultipartUploadCallbackReturnString;
    completeMultipartUploadCallback: MultipartUploadCallbackReturnAny;
};

export class AWSMultipartUpload {

    private host: string;
    private initiateMultipartUploadEndpoint: string;
    private preSignedUrlEndpoint: string;
    private completeMultipartUploadEndpoint: string;
    private chunkSize: number = 10 * 1024 * 1024 // 10mb;
    private initiateMultipartUploadCallback: MultipartUploadCallbackReturnString = () => '';
    private getPreSignedUrlCallback: MultipartUploadCallbackReturnString = () => '';
    private completeMultipartUploadCallback: MultipartUploadCallbackReturnAny = () => { return };

    public constructor(params: AWSMultipartUploadConstructorParams) {
        this.host = params.host;
        this.initiateMultipartUploadEndpoint = params.initiateMultipartUploadEndpoint;
        this.preSignedUrlEndpoint = params.preSignedUrlEndpoint;
        this.completeMultipartUploadEndpoint = params.completeMultipartUploadEndpoint;
        this.initiateMultipartUploadEndpoint;
        this.initiateMultipartUploadCallback = params.initiateMultipartUploadCallback;
        this.getPreSignedUrlCallback = params.getPreSignedUrlCallback;
        this.completeMultipartUploadCallback = params.completeMultipartUploadCallback;
        this.chunkSize = params.chunkSize;
    }

    public uploadFile(file: File): void {
        this.uploadFiles([file]);
    }

    public async uploadFiles(files: File[] = []): Promise<void> {
        if (!files.length) {
            return;
        }

        for (const file of files) {
            const totalChunks = Math.ceil(file.size / this.chunkSize);

            const uploadId = await this.initUpload(file);

            const chunksPromises = [];

            for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
                const start = (partNumber - 1) * this.chunkSize;
                const end = Math.min(start + this.chunkSize, file.size);
                const chunk = file.slice(start, end);

                const preSignedUrl = await this.getPreSignedUrl(uploadId, partNumber, file.name);

                const uploadChunkFetchCall = fetch(preSignedUrl, { method: 'PUT', body: chunk }).then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to upload part ${partNumber}`);
                    }
                    return response.headers.get('Etag');
                });

                chunksPromises.push(uploadChunkFetchCall);
            }

            const eTags = await Promise.all(chunksPromises);

            await this.completeUpload(uploadId, file.name, eTags);
        }
    }

    private async initUpload(file: File): Promise<string> {
        const response = await fetch(`${this.host}/${this.initiateMultipartUploadEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: file.name,
                fileType: file.type
            })
        });

        const jsonResponse = await response.json();

        const uploadId = this.initiateMultipartUploadCallback(jsonResponse);

        return uploadId;
    }

    private async getPreSignedUrl(uploadId: string, partNumber: number, filename: string): Promise<string> {
        const urlParams = new URLSearchParams({ uploadId, partNumber: partNumber.toString(), filename });

        const response = await fetch(`${this.host}/${this.preSignedUrlEndpoint}?${urlParams}`);

        const jsonResponse = await response.json();

        const url = this.getPreSignedUrlCallback(jsonResponse);

        return url;
    }

    private async completeUpload(uploadId: string, filename: string, eTags: (string | null)[] = []): Promise<any> {
        const parts = eTags.map((etag, index) => ({ ETag: etag, PartNumber: index + 1 }));

        const response = await fetch(`${this.host}/${this.completeMultipartUploadEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, uploadId, parts })
        });

        const jsonResponse = await response.json();

        const callbackResponse = this.completeMultipartUploadCallback(jsonResponse);

        return callbackResponse;
    }
}