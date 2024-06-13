import { AWSMultipartUpload } from './lib';

const fileUploader = new AWSMultipartUpload({
    host: 'http://localhost:3000',
    initiateMultipartUploadEndpoint: 'initiate-multipart-upload',
    preSignedUrlEndpoint: 'get-presigned-url',
    completeMultipartUploadEndpoint: 'complete-multipart-upload',
    initiateMultipartUploadCallback: (response: any) => { return response.uploadId; },
    getPreSignedUrlCallback: (response: any) => { return response.url },
    completeMultipartUploadCallback: (response: any) => {
        console.log(response);
    },
    chunkSize: 10
});