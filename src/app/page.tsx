"use client";
import { useEffect, useState, useCallback } from "react";

export default function Home() {
  type Item = { id: number; name: string; hazard_level: string; description?: string | null };
  type Location = { id: number; name: string; address: string };
  type PickupItem = { category_id: number; quantity: number };
  type Pickup = { id: number; status: string; resident_id: number; assigned_collector_id: number | null; address: string; preferred_time: string | null; urgency?: string; items: PickupItem[] };
  type Analytics = { total_pickups: number; completed_pickups: number; pending_pickups: number; total_items: number };
  type Me = { id: number; email: string; role: string };

  const [items, setItems] = useState<Item[]>([]);
  const [locs, setLocs] = useState<Location[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string; email: string; role: string }[]>([]);
  const [pickup, setPickup] = useState({ resident_id: "", address: "", preferred_time: "", urgency: "standard", items: "[]" });
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [update, setUpdate] = useState({ id: "", status: "", collector: "" });
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Helper to set notice with automatic timeout
  const showNotice = (message: string, timeout = 5000) => {
    setNotice(message);
    setTimeout(() => {
      setNotice("");
    }, timeout);
  };
  const [me, setMe] = useState<Me | null>(null);
  
  // User-friendly item selection
  const [selectedItems, setSelectedItems] = useState<{[key: string]: number}>({});
  const [customItemDescription, setCustomItemDescription] = useState("");
  const [otherItems, setOtherItems] = useState(""); // For custom items not in categories
  
  // E-waste categories for easy selection - use database categories
  const getDisplayIcon = (categoryName: string) => {
    const iconMap: {[key: string]: string} = {
      "Laptops": "💻", "Computers": "💻", "Mobile Phones": "📱", "Phones": "📱",
      "Batteries": "🔋", "TVs": "📺", "Monitors": "📺", "Kitchen Appliances": "🍳",
      "Cables": "🔌", "Wires": "🔌", "Printers": "🖨️", "Scanners": "🖨️", 
      "Audio": "🎧", "Headphones": "🎧", "Speakers": "🎧",
      "Gaming Consoles": "🎮", "Gaming": "🎮", "Consoles": "🎮",
      "Wearables": "⌚", "Watch": "⌚", "Fitness": "⌚"
    };
    for (const [key, icon] of Object.entries(iconMap)) {
      if (categoryName.toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return "📦"; // default icon
  };
  
  // Use actual database categories with display enhancements
  const ewasteCategories = items.map(item => ({
    id: item.id,
    name: item.name,
    icon: getDisplayIcon(item.name),
    description: item.description || `Various ${item.name.toLowerCase()}`
  }));
  
  const toggleItemSelection = (categoryId: number) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      if (newItems[categoryId]) {
        delete newItems[categoryId];
      } else {
        newItems[categoryId] = 1;
      }
      return newItems;
    });
  };
  
  const updateItemQuantity = (categoryId: number, quantity: number) => {
    if (quantity <= 0) {
      setSelectedItems(prev => {
        const newItems = { ...prev };
        delete newItems[categoryId];
        return newItems;
      });
    } else {
      setSelectedItems(prev => ({ ...prev, [categoryId]: quantity }));
    }
  };
  
  const getSelectedItemsAsJSON = () => {
    const categoryItems = Object.entries(selectedItems).map(([categoryId, quantity]) => ({
      category_id: parseInt(categoryId),
      quantity
    }));
    
    // Add other items using the 'Other Items' category if any
    if (otherItems.trim()) {
      const otherCategory = ewasteCategories.find(cat => cat.name === "Other Items");
      if (otherCategory) {
        categoryItems.push({
          category_id: otherCategory.id,
          quantity: 1
        });
      }
    }
    
    return categoryItems;
  };
  
  // Helper to get category name from ID
  const getCategoryName = (categoryId: number) => {
    const category = ewasteCategories.find(c => c.id === categoryId);
    return category ? `${category.icon} ${category.name}` : `Item #${categoryId}`;
  };

  async function fetchJSON<T>(path: string, opts?: RequestInit): Promise<T> {
    const res = await fetch(path, { ...(opts || {}), headers: { "Content-Type": "application/json" } });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<T>;
  }

  const refreshBase = useCallback(async () => {
    try { 
      const categories = await fetchJSON<Item[]>("/api/items");
      
      // If no categories exist, create default ones
      if (categories.length === 0) {
        const defaultCategories = [
          { name: "Mobile Phones", hazard_level: 2, description: "Smartphones, tablets, feature phones" },
          { name: "Laptops & Computers", hazard_level: 2, description: "Laptops, desktops, monitors" },
          { name: "Batteries", hazard_level: 3, description: "All types of batteries" },
          { name: "TVs & Monitors", hazard_level: 2, description: "LED, LCD, CRT screens" },
          { name: "Kitchen Appliances", hazard_level: 1, description: "Microwaves, toasters, mixers" },
          { name: "Cables & Wires", hazard_level: 1, description: "Chargers, power cords, cables" },
          { name: "Printers & Scanners", hazard_level: 1, description: "Printers, scanners, fax machines" },
          { name: "Audio Equipment", hazard_level: 1, description: "Speakers, headphones, radios" },
          { name: "Other Items", hazard_level: 1, description: "Other electronic items not listed above" },
        ];
        
        for (const category of defaultCategories) {
          try {
            await fetchJSON("/api/items", { 
              method: "POST", 
              body: JSON.stringify(category) 
            });
          } catch {}
        }
        
        // Reload categories after creation
        setItems(await fetchJSON<Item[]>("/api/items"));
      } else {
        setItems(categories);
      }
    } catch {}
    
    try { setLocs(await fetchJSON<Location[]>("/api/locations")); } catch {}
    try { setUsers(await fetchJSON<{ id: number; name: string; email: string; role: string }[]>("/api/users")); } catch {}
    
    // Load analytics data
    try { setAnalytics(await fetchJSON<Analytics>("/api/analytics/summary")); } catch {}
  }, []);

  const refreshPickupsForRole = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (!me) return;
    if (me.role === "resident") {
      try { const data = await fetchJSON<Pickup[]>(`/api/pickups?role=resident&user_id=${me.id}&offset=${offset}`); setPickups(prev => append ? [...prev, ...data] : data); } catch {}
      return;
    }
    if (me.role === "collector") {
      // Collectors need to see all pickups to view available ones for assignment
      try { const data = await fetchJSON<Pickup[]>(`/api/pickups?offset=${offset}`); setPickups(prev => append ? [...prev, ...data] : data); } catch {}
      return;
    }
    try { const data = await fetchJSON<Pickup[]>(`/api/pickups?offset=${offset}`); setPickups(prev => append ? [...prev, ...data] : data); } catch {}
  }, [me]);

  useEffect(() => {
    const id = setTimeout(() => {
      void refreshBase();
      (async()=>{ try{ const m = await fetchJSON<{ authenticated: boolean; user: Me }>("/api/auth/me"); setMe(m.user);}catch{} })();
    }, 0);
    return () => clearTimeout(id);
  }, [refreshBase]);

  useEffect(() => {
    const id = setTimeout(() => { void refreshPickupsForRole(); }, 0);
    return () => clearTimeout(id);
  }, [refreshPickupsForRole]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-emerald-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">EcoWaste</div>
              <div className="text-xs text-gray-500">Sustainable E-Waste Management</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {me && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {me.email.charAt(0).toUpperCase()}
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{me.email}</div>
                  <div className="text-xs text-emerald-600 capitalize">{me.role}</div>
                </div>
              </div>
            )}
            <button 
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-full font-medium text-sm transition-all shadow-lg hover:shadow-xl" 
              onClick={async()=>{ await fetchJSON("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {notice && (
          <div className="mb-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-emerald-800 font-medium">{notice}</span>
            </div>
          </div>
        )}

        {/* Role-based Dashboard Routing */}
        {me?.role === "resident" && (
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Resident</h1>
            <p className="text-gray-600">Schedule e-waste pickups and track your requests</p>
          </div>
        )}

        {me?.role === "collector" && (
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Collector Dashboard</h1>
            <p className="text-gray-600">Manage pickup assignments and collections</p>
          </div>
        )}

        {me?.role === "admin" && (
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage the entire e-waste management system</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
          {/* RESIDENT DASHBOARD */}
          {me?.role === "resident" && (
            <>
              {/* Request E-Waste Pickup Form */}
              <section className="lg:col-span-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Request E-Waste Pickup</h2>
                    <p className="text-sm text-gray-600">Schedule a pickup for your electronic waste</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {me?.id}
                      </div>
                      <div className="text-sm text-emerald-800">
                        <span className="font-medium">Resident Account</span> • User ID: {me?.id}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Pickup Time</label>
                      <div className="relative">
                        <input 
                          className="w-full border border-gray-300 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-gray-900 bg-white placeholder-gray-500" 
                          placeholder="e.g., Morning 10-12 AM" 
                          value={pickup.preferred_time} 
                          onChange={e => setPickup({ ...pickup, preferred_time: e.target.value })} 
                        />
                        <svg className="absolute left-4 top-4 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency Level</label>
                      <div className="relative">
                        <select 
                          className="w-full border border-gray-300 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-gray-900 bg-white appearance-none cursor-pointer" 
                          value={pickup.urgency} 
                          onChange={e => setPickup({ ...pickup, urgency: e.target.value })}
                        >
                          <option value="low">🟢 Low - Within a week</option>
                          <option value="standard">🟡 Standard - Within 3 days</option>
                          <option value="medium">🟠 Medium - Within 2 days</option>
                          <option value="high">🔴 High - Urgent (same day)</option>
                        </select>
                        <svg className="absolute left-4 top-4 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <svg className="absolute right-4 top-4 h-5 w-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Address</label>
                      <div className="relative">
                        <input 
                          className="w-full border border-gray-300 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-gray-900 bg-white placeholder-gray-500" 
                          placeholder="Enter your complete pickup address" 
                          value={pickup.address} 
                          onChange={e => setPickup({ ...pickup, address: e.target.value })} 
                        />
                        <svg className="absolute left-4 top-4 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Select E-Waste Items</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {ewasteCategories.map(category => (
                          <div 
                            key={category.id}
                            onClick={() => toggleItemSelection(category.id)}
                            className={`cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 ${
                              selectedItems[category.id] 
                                ? 'border-emerald-500 bg-emerald-50 shadow-md' 
                                : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                            }`}
                          >
                            <div className="text-2xl mb-2">{category.icon}</div>
                            <div className="font-medium text-gray-900 text-sm">{category.name}</div>
                            <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                            
                            {selectedItems[category.id] && (
                              <div className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <button 
                                  className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center hover:bg-emerald-600 transition-colors"
                                  onClick={() => updateItemQuantity(category.id, (selectedItems[category.id] || 1) - 1)}
                                >
                                  -
                                </button>
                                <span className="font-bold text-emerald-700 w-6 text-center">{selectedItems[category.id]}</span>
                                <button 
                                  className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center hover:bg-emerald-600 transition-colors"
                                  onClick={() => updateItemQuantity(category.id, (selectedItems[category.id] || 1) + 1)}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Other Items Section */}
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Other Items (Not Listed Above)</label>
                        <div className="relative">
                          <input 
                            type="text"
                            className="w-full border border-gray-300 rounded-xl p-4 pl-12 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-gray-900 bg-white placeholder-gray-500" 
                            placeholder="e.g., Gaming console, Smart watch, Router, etc." 
                            value={otherItems} 
                            onChange={e => setOtherItems(e.target.value)}
                          />
                          <svg className="absolute left-4 top-4 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Enter any electronic items not covered in the categories above</p>
                      </div>
                      
                      {/* Selected items summary */}
                      {(Object.keys(selectedItems).length > 0 || otherItems.trim()) && (
                        <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="text-sm font-medium text-emerald-800 mb-2">📦 Selected Items:</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(selectedItems).map(([categoryId, quantity]) => {
                              const category = ewasteCategories.find(c => c.id === parseInt(categoryId));
                              return (
                                <span key={categoryId} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                                  {category?.icon} {category?.name} × {quantity}
                                </span>
                              );
                            })}
                            {otherItems.trim() && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                📦 Other: {otherItems.trim()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Additional description */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Details (Optional)</label>
                        <textarea 
                          className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-gray-900 bg-white placeholder-gray-500" 
                          rows={2} 
                          placeholder="Describe condition, brand, or any special handling needed..."
                          value={customItemDescription}
                          onChange={e => setCustomItemDescription(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                      disabled={isSubmitting || (Object.keys(selectedItems).length === 0 && !otherItems.trim()) || !pickup.address}
                      onClick={async () => { 
                        if (isSubmitting) return; // Prevent double-clicks
                        setIsSubmitting(true);
                        try{ 
                          // Validate address first
                          if (!pickup.address.trim()) {
                            showNotice("❌ Please enter your pickup address");
                            setIsSubmitting(false);
                            return;
                          }
                          
                          const itemsArray = getSelectedItemsAsJSON();
                          if (itemsArray.length === 0 && !otherItems.trim()) {
                            showNotice("❌ Please select at least one e-waste item or enter other items");
                            return;
                          }
                          // Combine custom description with other items description
                          let fullDescription = customItemDescription;
                          if (otherItems.trim()) {
                            fullDescription = fullDescription 
                              ? `${fullDescription}\n\nOther Items: ${otherItems.trim()}`
                              : `Other Items: ${otherItems.trim()}`;
                          }
                          
                          const body = { 
                            resident_id: String(me?.id ?? ""), 
                            address: pickup.address,
                            preferred_time: pickup.preferred_time,
                            urgency: pickup.urgency,
                            items: itemsArray,
                            description: fullDescription
                          }; 
                          await fetchJSON("/api/pickups", { method: "POST", body: JSON.stringify(body) }); 
                          showNotice("✅ Pickup request created successfully! Collectors will be notified."); 
                          await refreshPickupsForRole(); 
                          // Refresh analytics after creating pickup
                          try { setAnalytics(await fetchJSON<Analytics>("/api/analytics/summary")); } catch {}
                          setPickup({ resident_id: "", address: "", preferred_time: "", urgency: "standard", items: "[]" });
                          setSelectedItems({});
                          setCustomItemDescription("");
                          setOtherItems("");
                        }catch(e){ 
                          showNotice(e instanceof Error ? e.message : "❌ Error creating pickup - please try again"); 
                        } finally {
                          setIsSubmitting(false);
                        } 
                      }}
                    >
                      {isSubmitting ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                      {isSubmitting ? 'Creating Pickup...' : `Schedule Pickup (${Object.values(selectedItems).reduce((a, b) => a + b, 0) + (otherItems.trim() ? 1 : 0)} items)`}
                    </button>
                    <button 
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-2xl transition-colors flex items-center gap-2" 
                      onClick={() => {
                        setPickup({ resident_id: "", address: "", preferred_time: "", urgency: "standard", items: "[]" });
                        setSelectedItems({});
                        setCustomItemDescription("");
                        setOtherItems("");
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset Form
                    </button>
                  </div>
                </div>
                {/* Pagination: Load more */}
                <div className="flex justify-center mt-4">
                  <button
                    className="px-4 py-2 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm"
                    onClick={async ()=>{ await refreshPickupsForRole(pickups.length, true); }}
                  >
                    Load more
                  </button>
                </div>
              </section>

              {/* Resident's Pickup History */}
              <section className="lg:col-span-4 lg:self-start bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">My Pickup Requests</h3>
                    <p className="text-sm text-gray-600">Track your pickup status</p>
                  </div>
                </div>

                {(() => {
                  const activePickups = pickups.filter(p => p.status !== 'completed');
                  const completedPickups = pickups.filter(p => p.status === 'completed').slice(-2); // Last 2 completed
                  const displayPickups = [...activePickups, ...completedPickups];
                  
                  return displayPickups.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-600 mb-2">No pickup requests yet</h4>
                      <p className="text-gray-500 text-sm">Create your first pickup request above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {displayPickups.map(p => (
                      <div key={p.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold">
                              #{p.id}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">Pickup Request #{p.id}</div>
                              <div className="text-sm text-gray-600">{p.items.length} item{p.items.length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            p.status === 'completed' ? 'bg-green-100 text-green-700' :
                            p.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            p.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {p.status.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  );
                })()}
              </section>
            </>
          )}
          
          {/* COLLECTOR DASHBOARD */}
          {me?.role === "collector" && (
            <>
              {/* Available Pickups */}
              <section className="lg:col-span-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Available Pickups</h2>
                    <p className="text-sm text-gray-600">Pickup requests waiting for collection</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {pickups.filter(p => p.status === "pending" && !p.assigned_collector_id).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">All caught up!</h3>
                      <p className="text-gray-500">No pending pickups available right now</p>
                    </div>
                  ) : (
                    pickups.filter(p => p.status === "pending" && !p.assigned_collector_id).map(p => (
                      <div key={p.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                              #{p.id}
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">New Pickup Request</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  Resident #{p.resident_id}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                  {p.items.length} item{p.items.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                              PENDING
                            </span>
                          </div>
                        </div>

                        <div className="bg-white/70 rounded-xl p-4 mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Address:</span>
                              <div className="text-gray-600">{p.address}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Preferred Time:</span>
                              <div className="text-gray-600">{p.preferred_time}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Items:</span>
                              <div className="text-gray-600 flex flex-wrap gap-1">
                                {p.items.map((item, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    {getCategoryName(item.category_id)} × {item.quantity}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Priority:</span>
                              <span className={`font-medium ml-2 capitalize ${
                                p.urgency === 'high' ? 'text-red-600' :
                                p.urgency === 'medium' ? 'text-orange-600' :
                                p.urgency === 'standard' ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {p.urgency === 'high' ? '🔴 High' :
                                 p.urgency === 'medium' ? '🟠 Medium' :
                                 p.urgency === 'standard' ? '🟡 Standard' :
                                 '🟢 Low'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            className={`flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                            disabled={isSubmitting}
                            onClick={async () => {
                              if (isSubmitting) return;
                              setIsSubmitting(true);
                              try {
                                // Optimistic: move to assignments immediately
                                setPickups(prev => prev.map(pr => pr.id === p.id ? { ...pr, status: 'assigned', assigned_collector_id: me?.id ?? null } : pr));
                                await fetchJSON(`/api/pickups/${p.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ 
                                    status: "assigned", 
                                    assigned_collector_id: me?.id 
                                  })
                                });
                                showNotice(`Pickup #${p.id} assigned to you successfully!`);
                                // Parallel refresh + defer analytics
                                try {
                                  const [_, latest] = await Promise.all([
                                    refreshPickupsForRole(),
                                    new Promise<Analytics>(resolve => setTimeout(async () => resolve(await fetchJSON<Analytics>("/api/analytics/summary")), 600)),
                                  ]);
                                  setAnalytics(latest);
                                } catch {}
                              } catch(e) {
                                // roll back optimistic change
                                setPickups(prev => prev.map(pr => pr.id === p.id ? { ...pr, status: 'pending', assigned_collector_id: null } : pr));
                                showNotice(e instanceof Error ? e.message : "Error assigning pickup");
                              } finally {
                                setIsSubmitting(false);
                              }
                            }}
                          >
                            {isSubmitting ? (
                              <>
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Processing…
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Accept Pickup
                              </>
                            )}
                          </button>
                          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* My Assignments */}
              <section className="lg:col-span-4 lg:self-start bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">My Assignments</h3>
                    <p className="text-sm text-gray-600">Your active pickups</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const myPickups = pickups.filter(p => p.assigned_collector_id === me?.id);
                    const activePickups = myPickups.filter(p => p.status !== 'completed');
                    const completedPickups = myPickups.filter(p => p.status === 'completed').slice(-2); // Last 2 completed
                    const displayPickups = [...activePickups, ...completedPickups];
                    
                    return displayPickups.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-600 mb-2">No active assignments</h4>
                        <p className="text-gray-500 text-sm">Accept pickups to see them here</p>
                      </div>
                    ) : (
                      displayPickups.map(p => (
                      <div key={p.id} className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold">
                              #{p.id}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">Pickup #{p.id}</div>
                              <div className="text-sm text-gray-600">
                                Resident #{p.resident_id} • {p.items.length} items
                              </div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            p.status === 'completed' ? 'bg-green-100 text-green-700' :
                            p.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {p.status.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>

                        {p.status !== "completed" && (
                          <div className="flex gap-2">
                            <button 
                              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-xl text-sm shadow-lg transition-all flex items-center justify-center gap-2" 
                              onClick={async()=>{ 
                                try{ 
                                  await fetchJSON(`/api/pickups/${p.id}`, { method: "PATCH", body: JSON.stringify({ status: "completed" }) }); 
                                  showNotice("Pickup marked as completed!"); 
                                  await refreshPickupsForRole();
                                  // Refresh analytics after completion
                                  try { setAnalytics(await fetchJSON<Analytics>("/api/analytics/summary")); } catch {} 
                                }catch(e){ 
                                  showNotice(e instanceof Error? e.message: "Error completing pickup"); 
                                } 
                              }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Complete
                            </button>
                            <button 
                              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-xl text-sm transition-colors"
                              onClick={async()=>{ 
                                try{ 
                                  await fetchJSON(`/api/pickups/${p.id}`, { method: "PATCH", body: JSON.stringify({ status: "in_progress" }) }); 
                                  await refreshPickupsForRole(); 
                                }catch(e){ 
                                  showNotice(e instanceof Error? e.message: "Error updating status"); 
                                } 
                              }}
                            >
                              In Progress
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                    );
                  })()}
                </div>
              </section>

              {/* Collector Stats */}
              <section className="lg:col-span-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 012-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Collector Dashboard</h3>
                    <p className="text-gray-600">Your performance and collection statistics</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-xl">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">{pickups.filter(p => p.assigned_collector_id === me?.id).length}</div>
                      <div className="text-emerald-100 text-sm">Total Assigned</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-xl">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">{pickups.filter(p => p.assigned_collector_id === me?.id && p.status === 'completed').length}</div>
                      <div className="text-green-100 text-sm">Completed</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-xl">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">{pickups.filter(p => p.assigned_collector_id === me?.id && p.status !== 'completed').length}</div>
                      <div className="text-blue-100 text-sm">In Progress</div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-xl">
                    <div className="flex items-center justify-center mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">
                        {pickups.filter(p => p.assigned_collector_id === me?.id).length > 0 ? 
                          Math.round((pickups.filter(p => p.assigned_collector_id === me?.id && p.status === 'completed').length / pickups.filter(p => p.assigned_collector_id === me?.id).length) * 100) : 0}%
                      </div>
                      <div className="text-purple-100 text-sm">Success Rate</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h4>
                  <div className="space-y-3">
                    <button 
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      onClick={async () => { await refreshPickupsForRole(); showNotice("Pickup list refreshed!"); }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh Pickups
                    </button>
                    <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0V7" />
                      </svg>
                      Route Optimization
                    </button>
                    <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Report Problem
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* ADMIN DASHBOARD */}
          {me?.role === "admin" && (
            <>
              {/* Admin Overview Stats */}
              <section className="col-span-full bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-purple-100 p-10 mb-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 012-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900">System Overview</h3>
                    <p className="text-gray-600 text-lg">Monitor all e-waste management activities</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="text-4xl font-bold mb-2">{users.length}</div>
                    <div className="text-purple-100 font-medium text-lg">Total Users</div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-8 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-4xl font-bold mb-2">{users.filter(u => u.role === 'resident').length}</div>
                    <div className="text-emerald-100 font-medium text-lg">Residents</div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div className="text-4xl font-bold mb-2">{users.filter(u => u.role === 'collector').length}</div>
                    <div className="text-blue-100 font-medium text-lg">Collectors</div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl p-8 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="text-4xl font-bold mb-2">{pickups.length}</div>
                    <div className="text-yellow-100 font-medium text-lg">Total Pickups</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-8 text-white shadow-xl transform hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-4xl font-bold mb-2">{pickups.filter(p => p.status === 'completed').length}</div>
                    <div className="text-green-100 font-medium text-lg">Completed</div>
                  </div>
                </div>
              </section>

              {/* All Pickup Requests Management */}
              <section className="lg:col-span-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-purple-100 p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">All Pickup Requests</h2>
                    <p className="text-sm text-gray-600">Monitor and manage system-wide pickup requests</p>
                  </div>
                </div>

                <div className="space-y-6 max-h-[500px] overflow-y-auto">
                  {pickups.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No pickup requests</h3>
                      <p className="text-gray-500">All pickup requests will appear here</p>
                    </div>
                  ) : (
                    pickups.map(p => (
                      <div key={p.id} className={`border rounded-2xl p-6 hover:shadow-lg transition-all ${
                        p.status === 'completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
                        p.status === 'in_progress' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' :
                        p.status === 'assigned' ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' :
                        'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${
                              p.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                              p.status === 'in_progress' ? 'bg-gradient-to-br from-blue-500 to-indigo-500' :
                              p.status === 'assigned' ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                              'bg-gradient-to-br from-gray-500 to-gray-600'
                            }`}>
                              #{p.id}
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">Pickup Request #{p.id}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  Resident #{p.resident_id}
                                </span>
                                {p.assigned_collector_id && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Collector #{p.assigned_collector_id}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                  {p.items.length} item{p.items.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              p.status === 'completed' ? 'bg-green-100 text-green-700' :
                              p.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              p.status === 'assigned' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {p.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white/70 rounded-xl p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Address:</span>
                              <div className="text-gray-600">{p.address}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Preferred Time:</span>
                              <div className="text-gray-600">{p.preferred_time}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* User Management */}
              <section className="lg:col-span-4 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-purple-100 p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">User Management</h3>
                    <p className="text-gray-600 text-lg">System users and roles</p>
                  </div>
                </div>

                <div className="space-y-6 max-h-[500px] overflow-y-auto">
                  {users.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-gray-600 mb-2">No users found</h4>
                      <p className="text-gray-500 text-sm">System users will appear here</p>
                    </div>
                  ) : (
                    users.map(user => (
                      <div key={user.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                              user.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                              user.role === 'collector' ? 'bg-gradient-to-br from-blue-500 to-indigo-500' :
                              'bg-gradient-to-br from-emerald-500 to-teal-500'
                            }`}>
                              #{user.id}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{user.email}</div>
                              <div className="text-sm text-gray-600">User ID: {user.id}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              user.role === 'collector' ? 'bg-blue-100 text-blue-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {user.role.toUpperCase()}
                            </span>
                            {user.id === me?.id && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">YOU</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Analytics Section */}
        <section className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-emerald-100 p-8 mt-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2h2a2 2 0 012-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Dashboard Analytics</h3>
                  <p className="text-gray-600">Real-time insights into your e-waste management system</p>
                </div>
              </div>
              <button 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2" 
                onClick={async () => setAnalytics(await fetchJSON("/api/analytics/summary"))}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">{analytics?.total_pickups ?? 0}</div>
                <div className="text-blue-100">Total Pickups</div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">{analytics?.completed_pickups ?? 0}</div>
                <div className="text-green-100">Completed</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">{analytics?.pending_pickups ?? 0}</div>
                <div className="text-yellow-100">Pending</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">{analytics?.total_items ?? 0}</div>
                <div className="text-purple-100">Total Items</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">{users.length}</div>
                <div className="text-emerald-100">Active Users</div>
              </div>
            </div>

            {analytics && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Completion Rate</h4>
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-1000" 
                        style={{ width: `${analytics.total_pickups > 0 ? (analytics.completed_pickups / analytics.total_pickups) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                      {analytics.total_pickups > 0 ? Math.round((analytics.completed_pickups / analytics.total_pickups) * 100) : 0}%
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">System Health</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-700 font-medium">All systems operational</span>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )}
          </section>
      </main>
    </div>
  );
}
