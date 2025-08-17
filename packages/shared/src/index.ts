export type Health = { status: 'ok'; ts: string };

export type UserRole = 'admin' | 'manager' | 'driver' | 'viewer';

export interface UserDTO {
  id: string;
  name?: string | null;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type PackageStatus = 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';

export interface RecipientInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface PackageDTO {
  id: string;
  barcode: string;
  status: PackageStatus;
  location?: { lat: number; lng: number } | null;
  recipient: RecipientInfo;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  last_updated: string;
  delivered_at?: string | null;
  driver_id?: string | null;
}

export type DeliveryEventType =
  | 'package_scanned'
  | 'status_updated'
  | 'location_changed'
  | 'delivery_completed';

export type DeliveryEventSource = 'scanner' | 'manual' | 'system';

export interface DeliveryEventDTO {
  id: string;
  type: DeliveryEventType;
  payload: Record<string, unknown>;
  timestamp: string;
  source: DeliveryEventSource;
  package_id: string;
}

export interface AuditEntryDTO {
  id: string;
  timestamp: string;
  action: string;
  user_id: string;
  package_id: string;
  location?: { lat: number; lng: number } | null;
  deviceInfo: Record<string, unknown>;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  signature?: Record<string, unknown> | null;
}

export interface AttachmentDTO {
  id: string;
  package_id: string;
  key: string;
  bucket: string;
  contentType: string;
  created_at: string;
}
