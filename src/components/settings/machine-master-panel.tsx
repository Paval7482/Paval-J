'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Edit3,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  IndianRupee,
} from 'lucide-react';
import {
  DEFAULT_MACHINES,
  MACHINE_CATEGORIES,
  formatINR,
  type MachineItem,
} from '@/lib/machines/machine-master';

export function MachineMasterPanel() {
  const [machines, setMachines] = useState<MachineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineItem | null>(null);
  const [formData, setFormData] = useState<Partial<MachineItem>>({
    name: '',
    modelCode: '',
    category: 'Murukku Machinery',
    capacity: '',
    price: 150000,
    description: '',
    isActive: true,
  });

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/machines');
      const data = await res.json();
      if (data.ok && Array.isArray(data.machines)) {
        setMachines(data.machines);
      } else {
        setMachines(DEFAULT_MACHINES);
      }
    } catch {
      setMachines(DEFAULT_MACHINES);
    } finally {
      setLoading(false);
    }
  };

  const saveMachinesList = async (updatedList: MachineItem[]) => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machines: updatedList }),
      });
      const data = await res.json();
      if (data.ok) {
        setMachines(updatedList);
        setStatusMsg({ type: 'success', text: 'Machine catalog updated successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save changes.' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error while saving catalog.' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleOpenAdd = () => {
    setEditingMachine(null);
    setFormData({
      name: '',
      modelCode: 'SLI-M-' + Math.floor(100 + Math.random() * 900),
      category: 'Murukku Machinery',
      capacity: '50 - 100 Kg/Day',
      price: 200000,
      description: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: MachineItem) => {
    setEditingMachine(m);
    setFormData({ ...m });
    setIsModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!formData.name || !formData.name.trim()) {
      alert('Machine Name is required');
      return;
    }

    let updated: MachineItem[];
    if (editingMachine) {
      updated = machines.map((m) =>
        m.id === editingMachine.id
          ? {
              ...m,
              name: formData.name || m.name,
              modelCode: formData.modelCode || m.modelCode,
              category: formData.category || m.category,
              capacity: formData.capacity || m.capacity,
              price: Number(formData.price) || 0,
              description: formData.description || '',
              isActive: formData.isActive ?? true,
            }
          : m
      );
    } else {
      const newItem: MachineItem = {
        id: 'mach-' + Date.now(),
        name: formData.name || '',
        modelCode: formData.modelCode || 'SLI-' + Date.now().toString().slice(-4),
        category: formData.category || 'Murukku Machinery',
        capacity: formData.capacity || 'Standard Capacity',
        price: Number(formData.price) || 0,
        description: formData.description || '',
        isActive: formData.isActive ?? true,
        createdAt: new Date().toISOString(),
      };
      updated = [newItem, ...machines];
    }

    saveMachinesList(updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm('Are you sure you want to delete ' + name + ' from Machine Master?')) {
      const updated = machines.filter((m) => m.id !== id);
      saveMachinesList(updated);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Reset catalog back to SLI standard default machinery?')) {
      saveMachinesList(DEFAULT_MACHINES);
    }
  };

  const filtered = machines.filter((m) => {
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.modelCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 text-slate-800">
      {/* Header Banner - Clean Light Mode */}
      <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40 border border-emerald-200/80 rounded-2xl p-6 relative overflow-hidden shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                <Package className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Machine Master Catalog
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                {machines.length} Machines
              </span>
            </div>
            <p className="text-sm text-slate-500 max-w-2xl">
              Manage your machinery master database with standard model codes, production capacities, and base INR pricing. These machines automatically populate the Customer Profile Selector.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              disabled={saving}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-all flex items-center gap-1.5"
              title="Reset default standard machines"
            >
              <RefreshCw className={'w-3.5 h-3.5 ' + (saving ? 'animate-spin' : '')} />
              Reset Defaults
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Machine
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMsg && (
        <div
          className={'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all ' + (
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          )}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by machine name, model code, or category..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['All', ...MACHINE_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ' + (
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-2xs'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Machine Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-600">Loading Machine Master catalog...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-700 font-semibold">No machines found</p>
          <p className="text-xs text-slate-400 mt-1">Try changing your search query or add a new machine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-slate-200/90 hover:border-emerald-500/60 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group hover:shadow-lg shadow-2xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                    {m.modelCode}
                  </span>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(m)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      title="Edit machine"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      title="Delete machine"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition-colors">
                  {m.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  {m.category}
                </p>

                {m.description && (
                  <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                    {m.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Capacity</span>
                  <span className="text-xs font-semibold text-slate-700">{m.capacity || 'Standard'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Base Price</span>
                  <span className="text-base font-bold text-emerald-700">
                    {formatINR(m.price)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal - Light Mode */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900">
                  {editingMachine ? 'Edit Machine Details' : 'Add New Machine to Master'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Machine Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Automatic Murukku Machine"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Model Code
                  </label>
                  <input
                    type="text"
                    value={formData.modelCode || ''}
                    onChange={(e) => setFormData({ ...formData, modelCode: e.target.value })}
                    placeholder="e.g. SLI-AMM-500"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Category
                  </label>
                  <select
                    value={formData.category || 'Murukku Machinery'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                  >
                    {MACHINE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Capacity / Output Spec
                  </label>
                  <input
                    type="text"
                    value={formData.capacity || ''}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    placeholder="e.g. 50 - 100 Kg/Day"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                    Base Price (INR ₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={formData.price ?? 0}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      placeholder="e.g. 225000"
                      className="w-full pl-8 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Short Description & Key Highlights
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Key features, dies included, motors, warranty specs..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={saving}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                {saving && <RefreshCw className="w-3 h-3 animate-spin" />}
                {editingMachine ? 'Save Changes' : 'Add Machine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}