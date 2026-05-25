import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit, Trash2, Save, X, Book, Layers, FileText, Users, 
  ChevronRight, LayoutDashboard, Search, Upload, CheckCircle, AlertCircle
} from 'lucide-react';

const API = 'http://localhost:3001/api/admin';

const AdminPortal = () => {
  const [activeTab, setActiveTab] = useState('books');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [stats, setStats] = useState({ books: 0, categories: 0, songs: 0 });

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:3001/api/stats');
      setStats({
        books: res.data.texts,
        categories: res.data.manuscripts,
        songs: res.data.songs
      });
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/${activeTab}`);
      setData(Array.isArray(res.data) ? res.data : (res.data.rows || []));
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${API}/${activeTab}/${editingItem.book_id || editingItem.cid || editingItem.id}`, formData);
      } else {
        if (activeTab === 'songs' && formData.imageFile) {
          const data = new FormData();
          Object.keys(formData).forEach(key => {
            if (key !== 'imageFile') data.append(key, formData[key]);
          });
          data.append('image', formData.imageFile);
          await axios.post(`${API}/${activeTab}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          await axios.post(`${API}/${activeTab}`, formData);
        }
      }
      setModalOpen(false);
      setEditingItem(null);
      setFormData({});
      fetchData();
      fetchStats();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await axios.delete(`${API}/${activeTab}/${id}`);
        fetchData();
        fetchStats();
      } catch (e) { console.error(e); }
    }
  };

  const tabs = [
    { id: 'books', name: 'Books', icon: Book, label: 'நூல்கள்' },
    { id: 'categories', name: 'Categories', icon: Layers, label: 'முதல் பிரிவு' },
    { id: 'subcategories', name: 'Sub-Categories', icon: Layers, label: 'துணைப் பிரிவு' },
    { id: 'songs', name: 'Manuscripts', icon: FileText, label: 'பாடல்கள்' },
    { id: 'users', name: 'Users', icon: Users, label: 'பயனர்கள்' },
  ];

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex">
      {/* Sidebar */}
      <aside className="w-72 bg-maroon text-white flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gold rounded-sm flex items-center justify-center font-black text-maroon">S</div>
            <h1 className="font-cinzel text-xl font-bold tracking-widest text-gold text-white">SUVADI <span className="text-[10px] block font-sans tracking-normal opacity-50 uppercase">Admin Portal</span></h1>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <div className="px-4 py-2 text-[10px] text-white/30 uppercase tracking-[0.3em] font-bold mb-4 italic">Management</div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-6 py-4 rounded-xl transition-all group ${
                activeTab === tab.id 
                ? 'bg-white/10 text-gold shadow-lg shadow-black/20' 
                : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-4">
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-gold' : 'text-white/40 group-hover:text-gold/50'}`} />
                <div className="text-left">
                  <div className="text-xs font-bold font-cinzel tracking-wider">{tab.name}</div>
                  <div className="text-[10px] tamil-text opacity-40">{tab.label}</div>
                </div>
              </div>
              {activeTab === tab.id && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </nav>

        <div className="p-8 mt-auto border-t border-white/5 bg-black/10">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold border border-gold/20 font-black">AD</div>
              <div>
                <div className="text-xs font-bold leading-none mb-1">Administrator</div>
                <div className="text-[9px] opacity-40 uppercase tracking-tighter">System Access Level 5</div>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-stone/10 p-8 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-white/80">
          <div>
            <h2 className="text-2xl font-cinzel font-black text-maroon flex items-center gap-3">
              <LayoutDashboard className="w-6 h-6 text-gold" />
              {tabs.find(t => t.id === activeTab).name} <span className="opacity-20 mx-2">/</span>
              <span className="text-stone/40 text-lg uppercase tracking-widest">{tabs.find(t => t.id === activeTab).label}</span>
            </h2>
          </div>
          
          <button 
            onClick={() => { setEditingItem(null); setFormData({status: 1}); setModalOpen(true); }}
            className="flex items-center gap-3 bg-maroon text-white px-8 py-3 rounded-xl hover:bg-maroon-dark transition-all shadow-xl shadow-maroon/20 hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-widest">Add New Record</span>
          </button>
        </header>

        <div className="p-10 max-w-7xl mx-auto">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone/5 flex items-center justify-between group hover:border-gold/30 transition-all">
                <div>
                   <div className="text-[10px] text-stone/40 font-bold uppercase tracking-widest mb-1">Total Manuscripts</div>
                   <div className="text-4xl font-black text-maroon">{stats.categories}</div>
                </div>
                <div className="w-14 h-14 bg-maroon/5 rounded-2xl flex items-center justify-center text-maroon group-hover:bg-maroon group-hover:text-white transition-all"><Book className="w-6 h-6" /></div>
             </div>
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone/5 flex items-center justify-between group hover:border-gold/30 transition-all">
                <div>
                   <div className="text-[10px] text-stone/40 font-bold uppercase tracking-widest mb-1">Total Folios</div>
                   <div className="text-4xl font-black text-maroon">{stats.songs}</div>
                </div>
                <div className="w-14 h-14 bg-gold/5 rounded-2xl flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-maroon transition-all"><FileText className="w-6 h-6" /></div>
             </div>
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone/5 flex items-center justify-between group hover:border-gold/30 transition-all">
                <div>
                   <div className="text-[10px] text-stone/40 font-bold uppercase tracking-widest mb-1">Search Requests</div>
                   <div className="text-4xl font-black text-maroon">24.5k</div>
                </div>
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Users className="w-6 h-6" /></div>
             </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-stone/5 border border-stone/10 overflow-hidden">
            <div className="p-8 border-b border-stone/10 flex items-center justify-between bg-stone/5">
               <div className="relative w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone/30" />
                  <input type="text" placeholder="Filter current records..." className="w-full bg-white border border-stone/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/10 focus:border-maroon/20" />
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-stone/40 text-[10px] font-bold uppercase">
                     <div className="w-2 h-2 rounded-full bg-emerald-500" /> Active System
                  </div>
               </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left">
                <thead className="bg-[#FAF9F8]">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">ID</th>
                    {activeTab === 'books' && <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Book Title</th>}
                    {activeTab === 'categories' && (
                       <>
                         <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Category Name</th>
                         <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Parent Book</th>
                       </>
                    )}
                    {activeTab === 'subcategories' && (
                       <>
                         <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Sub-Cat Name</th>
                         <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Parent Category</th>
                       </>
                    )}
                    {activeTab === 'songs' && (
                       <>
                         <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Folio #</th>
                         <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Transcription Preview</th>
                         <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">File</th>
                       </>
                    )}
                    {activeTab === 'users' && (
                       <>
                         <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Username</th>
                         <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Role</th>
                       </>
                    )}
                    <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-stone/50 uppercase tracking-widest border-b border-stone/5 text-right whitespace-nowrap">Actions Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone/5">
                  {loading ? (
                    <tr><td colSpan="6" className="p-20 text-center text-stone/30 italic font-cinzel">Loading archival data stream...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan="6" className="p-20 text-center text-stone/30 italic font-cinzel">No records detected in this section.</td></tr>
                  ) : data.map(item => (
                    <tr key={item.id || item.book_id || item.cid} className="group hover:bg-ivory transition-colors">
                      <td className="px-8 py-6 text-xs font-mono text-bronze">#{item.id || item.book_id || item.cid}</td>
                      
                      {activeTab === 'books' && <td className="px-8 py-6 tamil-text font-bold text-maroon">{item.name}</td>}
                      
                      {activeTab === 'categories' && (
                         <>
                           <td className="px-8 py-6 tamil-text font-bold text-maroon">{item.cname}</td>
                           <td className="px-8 py-6 text-xs text-stone/40 uppercase tracking-wider font-bold italic">{item.book_name}</td>
                         </>
                      )}

                      {activeTab === 'subcategories' && (
                         <>
                           <td className="px-8 py-6 tamil-text font-bold text-maroon">{item.sub_cat_name}</td>
                           <td className="px-8 py-6 text-[11px] text-stone/40 font-bold">{item.category_name}</td>
                         </>
                      )}

                      {activeTab === 'songs' && (
                         <>
                           <td className="px-8 py-6 font-cinzel font-black text-maroon">F{item.fid}</td>
                           <td className="px-8 py-6 tamil-text text-[11px] text-stone/50 max-w-xs truncate">{item.description}</td>
                           <td className="px-8 py-6 text-[10px] font-mono text-bronze uppercase">{item.fname}</td>
                         </>
                      )}

                      {activeTab === 'users' && (
                         <>
                           <td className="px-8 py-6 font-bold text-maroon">{item.username}</td>
                           <td className="px-8 py-6"><span className="px-3 py-1 bg-maroon/5 text-maroon text-[9px] font-black uppercase rounded-full">{item.role}</span></td>
                         </>
                      )}

                      <td className="px-8 py-6">
                         <div className={`flex items-center gap-2 text-[10px] font-bold uppercase ${item.status ? 'text-emerald-600' : 'text-red-400'}`}>
                            <div className={`w-2 h-2 rounded-full ${item.status ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {item.status ? 'Active' : 'Disabled'}
                         </div>
                      </td>

                      <td className="px-8 py-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingItem(item); setFormData(item); setModalOpen(true); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(item.id || item.book_id || item.cid)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Entry Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="bg-maroon p-8 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-cinzel font-bold tracking-widest">{editingItem ? 'Edit Record' : 'Create New Entry'}</h3>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest font-bold">Modifying Archival Database Table: {activeTab}</p>
                </div>
                <button onClick={() => setModalOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-8">
                 {activeTab === 'books' && (
                    <div>
                       <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Book Title (Tamil)</label>
                       <input 
                         type="text" 
                         required
                         value={formData.name || ''} 
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         className="w-full bg-stone/5 border border-stone/10 rounded-xl px-6 py-4 focus:ring-2 focus:ring-maroon/20 focus:outline-none tamil-body text-maroon font-bold"
                         placeholder="Enter book name..."
                       />
                    </div>
                 )}

                 {activeTab === 'categories' && (
                    <div className="space-y-6">
                       <div>
                          <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Parent Book ID</label>
                          <input type="number" required value={formData.book_id || ''} onChange={e => setFormData({...formData, book_id: e.target.value})} className="w-full bg-stone/5 border border-stone/10 rounded-xl px-6 py-4" />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Category Name (Tamil)</label>
                          <input type="text" required value={formData.cname || ''} onChange={e => setFormData({...formData, cname: e.target.value})} className="w-full bg-stone/5 border border-stone/10 rounded-xl px-6 py-4 tamil-body font-bold text-maroon" />
                       </div>
                    </div>
                 )}

                 {activeTab === 'songs' && (
                    <div className="grid grid-cols-2 gap-8">
                       <div className="col-span-2">
                          <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Sub-Category Selection (ID)</label>
                          <input type="number" required value={formData.cid || ''} onChange={e => setFormData({...formData, cid: e.target.value})} className="w-full bg-stone/5 border border-stone/10 rounded-xl px-6 py-4" />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Folio / Page Number</label>
                          <input type="number" required value={formData.fid || ''} onChange={e => setFormData({...formData, fid: e.target.value})} className="w-full bg-stone/5 border border-stone/10 rounded-xl px-6 py-4" />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Upload Image (JPG)</label>
                          <input type="file" onChange={e => setFormData({...formData, imageFile: e.target.files[0]})} className="w-full text-xs text-stone/40" />
                       </div>
                       <div className="col-span-2">
                          <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Scholarly Transcription</label>
                          <textarea rows="5" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-stone/5 border border-stone/10 rounded-xl px-6 py-4 tamil-body" />
                       </div>
                    </div>
                 )}

                 {activeTab === 'users' && (
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-6">
                          <div>
                             <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Username</label>
                             <input type="text" required value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3" />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Password</label>
                             <input type="password" required value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3" />
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-stone/40 uppercase tracking-widest mb-3">Email Address</label>
                          <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-stone/5 border border-stone/10 rounded-xl px-4 py-3" />
                       </div>
                    </div>
                 )}

                 <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setFormData({...formData, status: formData.status ? 0 : 1})} className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${formData.status ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                       <div className={`w-2 h-2 rounded-full ${formData.status ? 'bg-emerald-500' : 'bg-red-500'}`} />
                       {formData.status ? 'Active System' : 'Disabled'}
                    </button>
                 </div>

                 <div className="pt-6 flex gap-4">
                    <button type="submit" className="flex-1 bg-maroon text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-maroon-dark transition-all shadow-xl shadow-maroon/20">
                       <div className="flex items-center justify-center gap-3"><Save className="w-5 h-5" /> {editingItem ? 'Save Updates' : 'Sync to Archive'}</div>
                    </button>
                    <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-stone/5 text-stone/40 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-stone/10 transition-all">Cancel</button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPortal;
