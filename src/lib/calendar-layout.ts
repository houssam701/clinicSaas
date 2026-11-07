/**
 * Pure layout math for the appointments calendar: where each appointment sits
 * on the time grid, and side-by-side lanes for ones that overlap. No React, no IO.
 */

import { zonedParts } from "@/lib/time-zone";

/** Default visible hours; widened to fit appointments outside them. */
export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 20;

/** Bookable slot size when clicking an empty part of the grid. */
export const SLOT_MINUTES = 30;

export interface TimedItem {
  id: string;
  scheduled_time: string;
  duration_minutes: number;
}

export interface PlacedItem<T extends TimedItem> {
  item: T;
  /** YYYY-MM-DD in the clinic's zone */
  date: string;
  /** Minutes from midnight (clinic zone) */
  startMinute: number;
  endMinute: number;
  /** 0-based lane among overlapping items, and how many lanes the group uses */
  lane: number;
  lanes: number;
}

/** The day and minute-of-day of an appointment in `zone`. */
export function placeInZone<T extends TimedItem>(item: T, zone: string) {
  const p = zonedParts(new Date(item.scheduled_time), zone);
  const startMinute = p.hour * 60 + p.minute;
  // An appointment running past midnight is drawn to the end of its first day
  const endMinute = Math.min(startMinute + item.duration_minutes, 24 * 60);
  return { date: p.date, startMinute, endMinute };
}

/**
 * Assigns lanes so overlapping items in one column sit side by side. Items
 * that overlap (directly or through a chain) form a group sharing a lane count.
 */
export function layoutColumn<T extends TimedItem>(items: T[], zone: string): PlacedItem<T>[] {
  const placed = items
    .map((item) => ({ item, ...placeInZone(item, zone), lane: 0, lanes: 1 }))
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);

  let group: typeof placed = [];
  let groupEnd = -1;
  const laneEnds: number[] = [];

  const closeGroup = () => {
    const lanes = Math.max(1, ...group.map((g) => g.lane + 1));
    for (const g of group) g.lanes = lanes;
    group = [];
    laneEnds.length = 0;
  };

  for (const p of placed) {
    if (p.startMinute >= groupEnd && group.length > 0) closeGroup();
    // First lane that is free at this start time
    let lane = laneEnds.findIndex((end) => end <= p.startMinute);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = p.endMinute;
    p.lane = lane;
    group.push(p);
    groupEnd = Math.max(groupEnd, p.endMinute);
  }
  if (group.length > 0) closeGroup();
  return placed;
}

/** Visible hour range: the default, widened to include every item. */
export function visibleHours(placed: { startMinute: number; endMinute: number }[]) {
  let start = DEFAULT_START_HOUR;
  let end = DEFAULT_END_HOUR;
  for (const p of placed) {
    start = Math.min(start, Math.floor(p.startMinute / 60));
    end = Math.max(end, Math.ceil(p.endMinute / 60));
  }
  return { startHour: start, endHour: Math.min(end, 24) };
}

/** "09:30" from minutes since midnight. */
export const minuteLabel = (minute: number) =>
  `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
