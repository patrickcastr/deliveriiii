import 'fastify';

declare module 'fastify' {
  interface FastifyContextConfig {
    rateLimit?: {
      max: number;
      timeWindow: string | number;
  keyGenerator?: (req: any) => string;
    };
  }
}
