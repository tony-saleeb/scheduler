/**
 * Firebase Configuration for Church Service Scheduler
 * 
 * Data Structure:
 * - Each slot has date, start time (hour + minute), end time (hour + minute)
 * - Multiple servants can sign up per slot
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, get } from 'firebase/database';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyArwMtZNn766oKR0TSq0rXbLcDaTcRdd00",
  authDomain: "scheduler-558ae.firebaseapp.com",
  databaseURL: "https://scheduler-558ae-default-rtdb.firebaseio.com",
  projectId: "scheduler-558ae",
  storageBucket: "scheduler-558ae.firebasestorage.app",
  messagingSenderId: "756878918999",
  appId: "1:756878918999:web:fcf31cc52c9f48481cea12",
  measurementId: "G-ZX43KNS2JL"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const slotsRef = ref(database, 'slots');

/**
 * Create unique key for a time slot
 */
const createSlotKey = (date, startHour, startMin, endHour, endMin) => 
  `${date}_${String(startHour).padStart(2, '0')}${String(startMin).padStart(2, '0')}-${String(endHour).padStart(2, '0')}${String(endMin).padStart(2, '0')}`;

/**
 * Add a new time slot
 */
export const addTimeSlot = async (date, startHour, startMinute, endHour, endMinute) => {
  // Validate time range
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  
  if (endTotal <= startTotal) {
    return { success: false, message: 'End time must be after start time' };
  }
  
  const slotKey = createSlotKey(date, startHour, startMinute, endHour, endMinute);
  const slotRef = ref(database, `slots/${slotKey}`);
  
  const existing = await get(slotRef);
  if (existing.val()) {
    return { success: false, message: 'This time slot already exists' };
  }
  
  await set(slotRef, {
    date,
    startHour,
    startMinute,
    endHour,
    endMinute,
    attendees: [],
    createdAt: Date.now()
  });
  
  return { success: true, message: 'Time slot added!' };
};

/**
 * Add attendee to a slot
 */
export const addAttendee = async (slotKey, userName) => {
  const slotRef = ref(database, `slots/${slotKey}`);
  const snapshot = await get(slotRef);
  const data = snapshot.val();
  
  if (!data) return { success: false, message: 'Time slot not found' };
  
  const attendees = data.attendees || [];
  if (attendees.includes(userName)) {
    return { success: false, message: 'Already signed up' };
  }
  
  await set(slotRef, { ...data, attendees: [...attendees, userName] });
  return { success: true, message: 'Signed up!' };
};

/**
 * Remove attendee from a slot
 */
export const removeAttendee = async (slotKey, userName) => {
  const slotRef = ref(database, `slots/${slotKey}`);
  const snapshot = await get(slotRef);
  const data = snapshot.val();
  
  if (!data) return { success: false, message: 'Not found' };
  
  const updated = (data.attendees || []).filter(n => n !== userName);
  await set(slotRef, { ...data, attendees: updated });
  return { success: true };
};

/**
 * Remove a slot
 */
export const removeSlot = async (slotKey) => {
  await remove(ref(database, `slots/${slotKey}`));
};

/**
 * Clear all slots
 */
export const clearAllSlots = async () => {
  await remove(slotsRef);
};

/**
 * Subscribe to slots
 */
export const subscribeToSlots = (callback) => {
  return onValue(slotsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const arr = Object.entries(data).map(([key, val]) => ({ ...val, key }))
        .sort((a, b) => {
          const d = new Date(a.date) - new Date(b.date);
          if (d !== 0) return d;
          return (a.startHour * 60 + (a.startMinute || 0)) - (b.startHour * 60 + (b.startMinute || 0));
        });
      callback(arr);
    } else {
      callback([]);
    }
  });
};

export { database, slotsRef };
