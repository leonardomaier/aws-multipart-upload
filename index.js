const express = require('express')
const cors = require('cors')
const AWS = require('aws-sdk')
const app = express()
const port = 3000

app.use(express.json())
app.use(cors())

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
  region: process.env.AWS_REGION
})

async function cleanupIncompleteMultipartUploads(bucketName) {
  try {
    const uploads = await s3.listMultipartUploads({ Bucket: process.env.S3_BUCKET }).promise();

    if (uploads.Uploads && uploads.Uploads.length > 0) {
      for (const upload of uploads.Uploads) {
        await s3.abortMultipartUpload({
          Bucket: process.env.S3_BUCKET,
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

// cleanupIncompleteMultipartUploads();


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
})

app.post('/initiate-multipart-upload', async (req, res) => {
  const { filename, fileType } = req.body;

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: filename,
    ContentType: fileType
  };

  try {
    const { UploadId } = await s3.createMultipartUpload(params).promise();
    res.json({ uploadId: UploadId });
  } catch (err) {
    console.error('Error initiating multipart upload:', err);
    res.status(500).json({ error: 'Failed to initiate multipart upload' });
  }
});

app.get('/get-presigned-url', async (req, res) => {
  const { uploadId, partNumber } = req.query;
  const { filename } = req.query;
  
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: filename,
    PartNumber: parseInt(partNumber, 10),
    UploadId: uploadId
  };
  
  try {
    const url = await s3.getSignedUrlPromise('uploadPart', params);
    res.json({ url });
  } catch (err) {
    console.error('Error generating pre-signed URL:', err);
    res.status(500).json({ error: 'Failed to generate pre-signed URL' });
  }
});

app.post('/complete-multipart-upload', async (req, res) => {
  const { uploadId, parts } = req.body;
  const { filename } = req.body;
  
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: filename,
    MultipartUpload: {
      Parts: parts.map((part, index) => ({
        ETag: part.ETag,
        PartNumber: part.PartNumber
      }))
    },
    UploadId: uploadId
  };

  console.log(JSON.stringify(params));

  try {
    const result = await s3.completeMultipartUpload(params).promise();
    res.json({ result });
  } catch (err) {
    console.error('Error completing multipart upload:', err);
    res.status(500).json({ error: 'Failed to complete multipart upload' });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})