# aws-multipart-upload

It displays how to use multipart upload when you need to upload large files to the S3 storage. The solution splits the file into chunks of 10mb (it's arbitrary, you can change) and starts the multipart upload transaction, after that each chunk will be uploaded until we call the upload completed.