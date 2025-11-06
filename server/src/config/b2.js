import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  endpoint: process.env.B2_ENDPOINT,
  accessKeyId: process.env.B2_KEY_ID,
  secretAccessKey: process.env.B2_APPLICATION_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region: process.env.B2_REGION
});

export const uploadChunkToB2 = async (key, buffer, contentType) => {
  const params = {
    Bucket: process.env.B2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  };

  return await s3.upload(params).promise();
};

export const getSignedUrl = (key, expiresIn = 3600) => {
  const params = {
    Bucket: process.env.B2_BUCKET_NAME,
    Key: key,
    Expires: expiresIn
  };

  return s3.getSignedUrl('getObject', params);
};

export const deleteFile = async (key) => {
  const params = {
    Bucket: process.env.B2_BUCKET_NAME,
    Key: key
  };

  return await s3.deleteObject(params).promise();
};

export const downloadFile = async (key) => {
  const params = {
    Bucket: process.env.B2_BUCKET_NAME,
    Key: key
  };

  return await s3.getObject(params).promise();
};

export default s3;
