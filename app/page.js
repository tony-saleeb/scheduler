/**
 * توزيعة الخدام علي النادي
 * Only the device that added a name can remove it
 */

"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  subscribeToSlots, 
  addTimeSlot, 
  addAttendee,
  removeAttendee,
  removeSlot, 
  clearAllSlots 
} from '@/lib/firebase';

const ADMIN_PASSWORD = "admin123";

// Helper to get/set names added by this device
const getMyNames = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('mySignups') || '{}');
  } catch {
    return {};
  }
};

const addMyName = (slotKey, name) => {
  const myNames = getMyNames();
  if (!myNames[slotKey]) myNames[slotKey] = [];
  if (!myNames[slotKey].includes(name)) {
    myNames[slotKey].push(name);
    localStorage.setItem('mySignups', JSON.stringify(myNames));
  }
};

const removeMyName = (slotKey, name) => {
  const myNames = getMyNames();
  if (myNames[slotKey]) {
    myNames[slotKey] = myNames[slotKey].filter(n => n !== name);
    localStorage.setItem('mySignups', JSON.stringify(myNames));
  }
};

const isMyName = (slotKey, name) => {
  const myNames = getMyNames();
  return myNames[slotKey]?.includes(name) || false;
};

const formatTime = (hour, minute) => {
  const period = hour >= 12 ? 'م' : 'ص';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
};

const getDayName = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', { weekday: 'long' });
};

const getFormattedDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
};

const groupSlotsByDate = (slots) => {
  const grouped = {};
  slots.forEach(slot => {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  });
  return Object.entries(grouped).sort((a, b) => new Date(a[0]) - new Date(b[0]));
};

// Toast
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast ${type}`}>{message}</div>;
};

// Time Picker
const TimePicker = ({ label, hour, minute, onChangeHour, onChangeMinute }) => {
  const isAM = hour < 12;
  const displayHour = hour % 12 || 12;

  return (
    <div className="time-picker-simple">
      <label>{label}</label>
      <div className="time-inputs">
        <select value={displayHour} onChange={(e) => {
          const h = parseInt(e.target.value);
          onChangeHour(isAM ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12));
        }}>
          {[12,1,2,3,4,5,6,7,8,9,10,11].map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span>:</span>
        <select value={minute} onChange={(e) => onChangeMinute(parseInt(e.target.value))}>
          {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => 
            <option key={m} value={m}>{String(m).padStart(2,'0')}</option>
          )}
        </select>
        <div className="ampm-btns">
          <button className={isAM ? 'active' : ''} onClick={() => !isAM && onChangeHour(hour - 12)}>ص</button>
          <button className={!isAM ? 'active' : ''} onClick={() => isAM && onChangeHour(hour + 12)}>م</button>
        </div>
      </div>
    </div>
  );
};

// Slot Card
const SlotCard = ({ slot, onAdd, onRemoveAttendee, onRemove, isAdmin }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const attendees = slot.attendees || [];

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const res = await onAdd(slot.key, name.trim());
    setLoading(false);
    if (res.success) {
      addMyName(slot.key, name.trim()); // Track this name as mine
      setName('');
    }
  };

  const handleRemove = (attendeeName) => {
    if (confirm(`إزالة ${attendeeName}؟`)) {
      removeMyName(slot.key, attendeeName);
      onRemoveAttendee(slot.key, attendeeName);
    }
  };

  const timeStr = `${formatTime(slot.startHour, slot.startMinute || 0)} ← ${formatTime(slot.endHour, slot.endMinute || 0)}`;

  return (
    <div className="slot-card">
      <div className="slot-time">{timeStr}</div>
      
      {attendees.length > 0 && (
        <div className="slot-attendees">
          {attendees.map((a, i) => {
            const canRemove = isAdmin || isMyName(slot.key, a);
            return (
              <span key={i} className="attendee-chip">
                {a}
                {canRemove && (
                  <button onClick={() => handleRemove(a)}>×</button>
                )}
              </span>
            );
          })}
        </div>
      )}
      
      <div className="slot-signup">
        <input
          type="text"
          placeholder="اكتب اسمك"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          disabled={loading}
        />
        <button onClick={handleAdd} disabled={loading || !name.trim()}>
          {loading ? '...' : 'سجّل'}
        </button>
      </div>
      
      {isAdmin && (
        <button className="delete-btn" onClick={() => onRemove(slot.key)}>حذف</button>
      )}
    </div>
  );
};

// Date Section
const DateSection = ({ date, slots, onAdd, onRemoveAttendee, onRemove, isAdmin }) => {
  return (
    <div className="date-section">
      <div className="date-header">
        <span className="day">{getDayName(date)}</span>
        <span className="date">{getFormattedDate(date)}</span>
      </div>
      <div className="date-slots">
        {slots.map(slot => (
          <SlotCard
            key={slot.key}
            slot={slot}
            onAdd={onAdd}
            onRemoveAttendee={onRemoveAttendee}
            onRemove={onRemove}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
};

// Admin Modal
const AdminModal = ({ onLogin, onClose }) => {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) onLogin();
    else setErr('Wrong password');
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>🔐 Admin</h3>
        <form onSubmit={submit}>
          <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
          {err && <p className="err">{err}</p>}
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary">Login</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main
export default function Home() {
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState('');
  const [sh, setSh] = useState(9);
  const [sm, setSm] = useState(0);
  const [eh, setEh] = useState(11);
  const [em, setEm] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeToSlots(s => { setSlots(s); setLoading(false); });
    return unsub;
  }, []);

  const groupedSlots = useMemo(() => groupSlotsByDate(slots), [slots]);

  const msg = (m, t='success') => setToast({ message: m, type: t });

  const addSlot = async () => {
    if (!date) return msg('اختر تاريخ', 'error');
    const res = await addTimeSlot(date, sh, sm, eh, em);
    msg(res.success ? 'تمت الإضافة ✓' : res.message, res.success ? 'success' : 'error');
    if (res.success) setDate('');
  };

  const handleAdd = async (key, name) => {
    const res = await addAttendee(key, name);
    msg(res.success ? `تم تسجيل ${name} ✓` : res.message, res.success ? 'success' : 'error');
    return res;
  };

  const handleRemoveAtt = async (key, name) => {
    await removeAttendee(key, name);
    msg(`تم حذف ${name}`);
  };

  const handleRemoveSlot = async (key) => {
    if (confirm('حذف؟')) {
      await removeSlot(key);
      msg('تم الحذف');
    }
  };

  const clearAll = async () => {
    if (confirm('حذف الكل؟')) {
      await clearAllSlots();
      msg('تم');
    }
  };

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>توزيعة الخدام علي النادي</h1>
          <p>لفترة نص السنة</p>
        </div>
        <button className={`admin-toggle ${isAdmin ? 'on' : ''}`} onClick={() => isAdmin ? setIsAdmin(false) : setShowModal(true)}>
          {isAdmin ? 'Exit' : 'Admin'}
        </button>
      </header>

      {isAdmin && (
        <section className="admin-box">
          <h2>إضافة ميعاد</h2>
          <div className="admin-form">
            <div className="field">
              <label>التاريخ</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="time-row">
              <TimePicker label="من" hour={sh} minute={sm} onChangeHour={setSh} onChangeMinute={setSm} />
              <TimePicker label="إلى" hour={eh} minute={em} onChangeHour={setEh} onChangeMinute={setEm} />
            </div>
            <div className="admin-btns">
              <button className="add-btn" onClick={addSlot}>إضافة</button>
              <button className="clear-btn" onClick={clearAll}>حذف الكل</button>
            </div>
          </div>
        </section>
      )}

      <section className="content">
        {loading ? (
          <div className="center"><div className="spinner"></div></div>
        ) : slots.length === 0 ? (
          <div className="center empty">
            <span>📅</span>
            <p>لا توجد مواعيد</p>
          </div>
        ) : (
          <div className="schedule">
            {groupedSlots.map(([date, dateSlots]) => (
              <DateSection
                key={date}
                date={date}
                slots={dateSlots}
                onAdd={handleAdd}
                onRemoveAttendee={handleRemoveAtt}
                onRemove={handleRemoveSlot}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </section>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      {showModal && <AdminModal onLogin={() => { setIsAdmin(true); setShowModal(false); }} onClose={() => setShowModal(false)} />}
    </main>
  );
}
