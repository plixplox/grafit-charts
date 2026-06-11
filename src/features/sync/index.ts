import type { HighlightState, ZoomWindow } from '@/shared/kernel';
import type { Switchable } from '@/shared/options';

export interface SyncOptions extends Switchable {
  /** Charts sharing a groupId are synchronized (a common group by default). */
  groupId?: string;
  /** Synchronize node highlighting (true by default). */
  nodeInteraction?: boolean;
  /** Synchronize zoom (true by default). */
  zoom?: boolean;
}

export interface SyncMember {
  /** Highlight coming from a neighboring chart (by data index). */
  onRemoteHighlight(highlight: HighlightState | undefined): void;
  /** Zoom window coming from a neighboring chart. */
  onRemoteZoom(window: ZoomWindow): void;
}

const groups = new Map<string, Set<SyncMember>>();

export function joinSyncGroup(groupId: string, member: SyncMember): () => void {
  let group = groups.get(groupId);
  if (!group) {
    group = new Set();
    groups.set(groupId, group);
  }
  group.add(member);
  return () => {
    group.delete(member);
    if (group.size === 0) groups.delete(groupId);
  };
}

export function broadcastHighlight(groupId: string, from: SyncMember, highlight: HighlightState | undefined): void {
  groups.get(groupId)?.forEach((member) => {
    if (member !== from) member.onRemoteHighlight(highlight);
  });
}

export function broadcastZoom(groupId: string, from: SyncMember, window: ZoomWindow): void {
  groups.get(groupId)?.forEach((member) => {
    if (member !== from) member.onRemoteZoom(window);
  });
}

/** Feature API for widgets (via registry.getFeature('sync')). */
export const syncApi = { joinSyncGroup, broadcastHighlight, broadcastZoom };
export type SyncApi = typeof syncApi;

export const syncModule = { kind: 'feature', name: 'sync', api: syncApi } as const;
