import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAuth } from '../../guards';
import { config } from '../../config';

const s3 = new S3Client({
  forcePathStyle: true,
  endpoint: process.env.S3_ENDPOINT,
  region: 'us-east-1',
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY || '', secretAccessKey: process.env.S3_SECRET_KEY || '' },
});

export default async function routes(app: FastifyInstance) {
  app.addHook('preHandler', async (req, reply) => {
    if (config.csrfEnabled && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      const header = (req.headers['x-csrf-token'] as string | undefined) || '';
      const cookie = (req.cookies?.['csrf_token'] as string | undefined) || '';
      if (!header || !cookie || header !== cookie) {
        return reply.code(403).send({ error: 'csrf_invalid' });
      }
    }
  });
  app.post('/packages/:id/attachments/sign', { preHandler: requireAuth('driver') }, async (req: FastifyRequest, reply: FastifyReply) => {
    const params = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ contentType: z.string(), key: z.string() }).parse(req.body);

    const bucket = process.env.S3_BUCKET || 'deliveryapp';
    const command = new PutObjectCommand({ Bucket: bucket, Key: body.key, ContentType: body.contentType });
    const url = await getSignedUrl(s3, command, { expiresIn: 300 });
    return reply.send({ url, bucket, key: body.key });
  });

  app.get('/packages/:id/attachments', { preHandler: requireAuth('viewer') }, async (_req: FastifyRequest, reply: FastifyReply) => {
    // Placeholder: would list from DB if persisted; return empty list for scaffold
    return reply.send({ items: [] });
  });
}
