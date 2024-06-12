const AWS = require('aws-sdk');

// Configure AWS SDK with your credentials and region
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    region: process.env.AWS_REGION
});

// Create an S3 object
const s3 = new AWS.S3();

// Function to clean up incomplete multipart uploads
async function cleanupIncompleteMultipartUploads(bucketName) {
  try {
    // List incomplete multipart uploads
    const uploads = await s3.listMultipartUploads({ Bucket: bucketName }).promise();

    // Abort each incomplete multipart upload
    if (uploads.Uploads && uploads.Uploads.length > 0) {
      for (const upload of uploads.Uploads) {
        await s3.abortMultipartUpload({
          Bucket: bucketName,
          Key: upload.Key,
          UploadId: upload.UploadId
        }).promise();
        console.log(`Aborted multipart upload for ${upload.Key}`);
      }
    } else {
      console.log('No incomplete multipart uploads found.');
    }
  } catch (err) {
    console.error('Error cleaning up incomplete multipart uploads:', err);
  }
}

// Usage
const bucketName = 'YOUR_BUCKET_NAME';
cleanupIncompleteMultipartUploads(bucketName);