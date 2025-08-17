import { Client as ElasticClient } from '@elastic/elasticsearch';

const es = new ElasticClient({ node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200' });

const PKG_INDEX = 'packages';
const AUDIT_INDEX = 'audit';

async function ensureIndexes() {
  for (const index of [PKG_INDEX, AUDIT_INDEX]) {
    const exists = await es.indices.exists({ index });
    if (!exists) {
      try {
        await es.indices.create({ index });
      } catch {
        /* ignore */
      }
    }
  }
}

export async function indexPackage(doc: any) {
  await ensureIndexes();
  await es.index({ index: PKG_INDEX, id: doc.id, document: {
    id: doc.id,
    barcode: doc.barcode,
    status: doc.status,
    driver_id: doc.driverId ?? null,
    created_at: doc.createdAt,
    last_updated: doc.lastUpdated,
  }});
}
export async function deletePackage(id: string) {
  await ensureIndexes();
  await es.delete({ index: PKG_INDEX, id }).catch(() => {});
}
export async function indexAudit(doc: any) {
  await ensureIndexes();
  await es.index({ index: AUDIT_INDEX, document: {
    id: doc.id,
    package_id: doc.packageId,
    action: doc.action,
    timestamp: doc.timestamp,
    user_id: doc.userId,
  }});
}
