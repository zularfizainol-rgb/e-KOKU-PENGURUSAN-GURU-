import React, { useState, useEffect } from 'react';
import { UserPlus, Edit3, X, Check } from 'lucide-react';
import { Teacher, SessionType } from '../types/koku';

interface EditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTeacher: (teacher: Teacher) => void;
  teacherToEdit?: Teacher | null;
}

export const EditTeacherModal: React.FC<EditTeacherModalProps> = ({
  isOpen,
  onClose,
  onSaveTeacher,
  teacherToEdit,
}) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [session, setSession] = useState<SessionType>('Pagi');

  useEffect(() => {
    if (teacherToEdit) {
      setName(teacherToEdit.name);
      setGender(teacherToEdit.gender);
      setSession(teacherToEdit.session);
    } else {
      setName('');
      setGender('L');
      setSession('Pagi');
    }
  }, [teacherToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const teacherData: Teacher = {
      id: teacherToEdit ? teacherToEdit.id : `t-${Date.now()}`,
      name: name.trim(),
      staffId: teacherToEdit?.staffId || `G${Date.now().toString().slice(-4)}`,
      gender,
      session,
      isAdmin: teacherToEdit?.isAdmin || false,
    };

    onSaveTeacher(teacherData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              {teacherToEdit ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {teacherToEdit ? 'Kemaskini Maklumat Guru' : 'Tambah Guru Baharu'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {teacherToEdit ? 'Kemaskini nama, sesi bertugas dan jantina guru' : 'Daftar guru ke dalam agihan kokurikulum'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Penuh Guru *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Ahmad Farhan bin Mohd Yusof"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-medium"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Sesi Bertugas Hakiki *
              </label>
              <select
                value={session}
                onChange={e => setSession(e.target.value as SessionType)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="Pagi">Sesi Pagi</option>
                <option value="Petang">Sesi Petang</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Jantina *
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value as 'L' | 'P')}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="L">Lelaki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{teacherToEdit ? 'Simpan Perubahan' : 'Tambah Guru'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
