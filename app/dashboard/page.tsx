"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

// --- FIREBASE IMPORTS ---
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase"; 

import { addItem, updateItem, deleteItem } from "@/actions/itemActions";
import { getAllItems, getAllLogs } from "@/actions/logActions"; 
import { QRCodeSVG } from "qrcode.react";

// --- HELPERS & SUB-COMPONENTS ---

const EditableCell = ({ value, field, item, onUpdate, children, type = "text", options = [], editTrigger = "doubleClick" }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || "");

  useEffect(() => {
    setCurrentValue(value || "");
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onUpdate(item, field, currentValue);
    }
  };

  const handleTrigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTrigger === "click") setIsEditing(true);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTrigger === "doubleClick") setIsEditing(true);
  };

  if (isEditing) {
    if (type === "select") {
      return (
        <select
          autoFocus
          value={currentValue}
          onChange={(e) => {
            setCurrentValue(e.target.value);
            setIsEditing(false);
            if (e.target.value !== value) onUpdate(item, field, e.target.value);
          }}
          onBlur={handleBlur}
          className="w-full bg-white border-2 border-[#005FB7] rounded px-1 py-1 text-sm font-bold outline-none shadow-sm text-black uppercase cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (type === "textarea") {
      return (
        <textarea
          autoFocus
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setCurrentValue(value);
              setIsEditing(false);
            }
          }}
          className="w-full bg-white border-2 border-[#005FB7] rounded px-3 py-2 text-base outline-none shadow-sm text-black cursor-text min-h-[120px] resize-y leading-relaxed"
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    if (type === "autobullet") {
      return (
        <textarea
          autoFocus
          value={currentValue}
          onChange={(e) => {
            let val = e.target.value;
            if (val.length === 1 && val !== '•' && val !== '\n') {
              val = '• ' + val;
            }
            setCurrentValue(val);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setCurrentValue(value);
              setIsEditing(false);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              const start = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const val = e.currentTarget.value;
              const newVal = val.substring(0, start) + '\n• ' + val.substring(end);
              setCurrentValue(newVal);
              setTimeout(() => {
                const target = e.target as HTMLTextAreaElement;
                target.selectionStart = target.selectionEnd = start + 3;
              }, 0);
            }
          }}
          onBlur={handleBlur}
          className="w-full bg-white border-2 border-[#005FB7] rounded px-3 py-2 text-base outline-none shadow-sm text-black cursor-text min-h-[120px] resize-y leading-relaxed"
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    return (
      <input
        autoFocus
        type={type === "date" ? "date" : "text"}
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleBlur();
          if (e.key === 'Escape') {
            setCurrentValue(value);
            setIsEditing(false);
          }
        }}
        className="w-full bg-white border-2 border-[#005FB7] rounded px-2 py-1 text-sm outline-none shadow-sm text-black cursor-text"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div 
      onClick={handleTrigger}
      onDoubleClick={handleDoubleClick}
      className="cursor-pointer hover:ring-1 hover:ring-[#005FB7]/30 rounded transition-all min-h-[24px] flex items-center w-full"
    >
      {children}
    </div>
  );
};

// Custom component to edit both Item Name and Inclusions simultaneously
const NameInclusionsCell = ({ item, onUpdateMulti }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nameVal, setNameVal] = useState(item.itemName || "");
  const [incVal, setIncVal] = useState(item.inclusions || "");

  useEffect(() => {
    setNameVal(item.itemName || "");
    setIncVal(item.inclusions || "");
  }, [item.itemName, item.inclusions]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    if (nameVal !== item.itemName || incVal !== item.inclusions) {
      onUpdateMulti(item, { itemName: nameVal, inclusions: incVal });
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 w-full bg-white p-2 border-2 border-[#005FB7] rounded shadow-lg relative z-10" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={nameVal}
          onChange={(e) => setNameVal(e.target.value)}
          className="w-full bg-[#F1F3F8] rounded px-2 py-1.5 text-sm outline-none text-black font-bold border border-transparent focus:border-[#005FB7]"
          placeholder="Item Name"
        />
        {item.inclusions ? (
          <textarea
            value={incVal}
            onChange={(e) => {
              let val = e.target.value;
              if (val.length === 1 && val !== '•' && val !== '\n') {
                val = '• ' + val;
              }
              setIncVal(val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const val = e.currentTarget.value;
                const newVal = val.substring(0, start) + '\n• ' + val.substring(end);
                setIncVal(newVal);
                setTimeout(() => {
                  const target = e.target as HTMLTextAreaElement;
                  target.selectionStart = target.selectionEnd = start + 3;
                }, 0);
              }
            }}
            className="w-full bg-[#F1F3F8] rounded px-2 py-1.5 text-xs outline-none text-black min-h-[60px] border border-transparent focus:border-[#005FB7] resize-y"
            placeholder="Inclusions..."
          />
        ) : null}
        <div className="flex justify-end gap-2 mt-1">
          <button onClick={(e) => { e.stopPropagation(); setIsEditing(false); setNameVal(item.itemName); setIncVal(item.inclusions); }} className="px-3 py-1.5 bg-[#E0E2EC] text-[#44474E] text-xs font-bold uppercase rounded cursor-pointer hover:bg-[#D6E3FF]">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1.5 bg-[#005FB7] text-white text-xs font-bold uppercase rounded cursor-pointer hover:bg-[#004ba0]">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="cursor-pointer hover:ring-1 hover:ring-[#005FB7]/30 rounded transition-all min-h-[24px] w-full p-1 block">
      <p className="font-bold text-sm text-[#1A1C1E] whitespace-normal break-words leading-tight select-none cursor-pointer">{item.itemName}</p>
      {item.inclusions && (
        <div className="text-xs text-[#74777F] mt-1 font-medium select-none whitespace-pre-wrap cursor-pointer">
          <span className="font-bold text-[#005FB7]">Includes:</span>
          {"\n" + item.inclusions}
        </div>
      )}
    </div>
  );
};


export default function UnifiedDashboard() {
  // --- STATES ---
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Cameras & Accessories");
  
  const [activeViewTab, setActiveViewTab] = useState("description");
  const [sidebarMinimized, setSidebarMinimized] = useState(true);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [sortOrder, setSortOrder] = useState("itemCode");
  const [sortConfig, setSortConfig] = useState({ key: 'itemCode', direction: 'asc' });
  
  const [copied, setCopied] = useState(false); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [tempGdriveLink, setTempGdriveLink] = useState("");
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<any[]>([]);
  const [editMaintenanceLogs, setEditMaintenanceLogs] = useState<any[]>([]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showClearBatchConfirm, setShowClearBatchConfirm] = useState(false);
  
  // Custom Edit States
  const [editingExplicit, setEditingExplicit] = useState<{ field: string, value: string } | null>(null);
  const [explicitSaveConfirm, setExplicitSaveConfirm] = useState(false);
  const [logInlineToDelete, setLogInlineToDelete] = useState<number | null>(null);
  const [editFormLogToDelete, setEditFormLogToDelete] = useState<number | null>(null);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qrValue, setQrValue] = useState("");

  const router = useRouter();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const categories = [
    "All", "Cameras & Accessories", "Lights & Accessories", "Sound & Accessories",
    "Computers & Peripherals", "Office Appliance", "Others"
  ];

  // --- SEARCH BAR AUTO CATEGORY SWITCH ---
  useEffect(() => {
    if (searchQuery.trim().length > 0 && activeCategory !== "All") {
      setActiveCategory("All");
    }
  }, [searchQuery, activeCategory]);

  // --- POPULATE EDIT MODAL STATE ---
  useEffect(() => {
    if (isModalOpen && selectedItem) {
      setEditMaintenanceLogs(selectedItem.maintenanceLogs || []);
    } else if (isModalOpen && !selectedItem) {
      setEditMaintenanceLogs([]);
    }
  }, [isModalOpen, selectedItem]);

  // --- DATA SYNC LOGIC ---
  const fetchAllData = async () => {
    try {
      const [logsRes, itemsRes] = await Promise.all([
        getAllLogs(),
        getAllItems()
      ]);

      if (itemsRes.success) {
        setItemsList(itemsRes.data || []);
      }
      if (logsRes.success) setLogs(logsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Data Sync Error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      fetchAllData();
    });
    return () => unsubscribe();
  }, [router]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setSortOrder("custom");
  };

  // --- LOGIC: FILTERED & SORTED ITEMS ---
  const filteredItems = itemsList
    .filter((item) => {
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      const searchLower = searchQuery.toLowerCase();
      return matchesCategory && (
        (item.itemName?.toLowerCase() || "").includes(searchLower) ||
        (item.itemCode?.toLowerCase() || "").includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortOrder === "oldest" || sortOrder === "newest") {
        const dateA = new Date(a.createdAt || a.id).getTime();
        const dateB = new Date(b.createdAt || b.id).getTime();
        return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
      }

      const aValue = (a[sortConfig.key] || "").toString().toLowerCase();
      const bValue = (b[sortConfig.key] || "").toString().toLowerCase();

      if (sortConfig.key === 'itemCode' || sortConfig.key === 'oldItemCode') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue, undefined, { numeric: true })
          : bValue.localeCompare(aValue, undefined, { numeric: true });
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });  

  // --- PRINT LOGIC ---
  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printCategories = categories.filter(c => c !== "All");
    const printedDate = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });

    const htmlContent = printCategories.map((cat, index) => {
      const categoryItems = itemsList
        .filter(item => item.category === cat)
        .sort((a, b) => (a.itemCode || "").localeCompare(b.itemCode || "", undefined, { numeric: true }));
        
      const rowsNeeded = Math.max(categoryItems.length, 12); 
      const isFirstPage = index === 0;

      const tableRows = Array.from({ length: rowsNeeded }).map((_, i) => {
        const item = categoryItems[i] || {};
        const isIssue = item.deviceStatus === 'Not Working' || item.deviceStatus === 'For Repair' || item.deviceStatus === 'Missing';
        const rowBg = isIssue ? 'background-color: #fceae6;' : '';
        const statusColor = 'color: black;';
        const inclusionsHtml = item.inclusions ? `<div style="font-size: 9px; margin-top: 4px; white-space: pre-wrap; color: #444;"><strong>Includes:</strong>\n${item.inclusions.replace(/</g, '&lt;')}</div>` : '';

        return `
          <tr style="${rowBg}">
            <td style="width: 10%">${item.itemCode || ""}</td>
            <td style="width: 25%;">
                <span style="font-weight: bold;">${item.itemName || ""}</span>
                ${inclusionsHtml}
            </td>
            <td style="width: 12%">${item.itemType || ""}</td>
            <td style="width: 15%">${item.serialNumber || ""}</td>
            <td style="width: 13%">${item.locationStored || ""}</td>
            <td style="width: 10%; ${statusColor} font-weight: bold;">${item.deviceStatus || ""}</td>
            <td style="width: 15%">${item.remarks || ""}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="page-container">
          ${isFirstPage ? `
          <div class="logo-header">
             <img src="/dbpi-logo.png" alt="DON BOSCO PRESS" style="height: 70px; display: block; margin: 0 auto;">
          </div>
          <div class="header-boxes">
            <div class="black-box">EQUIPMENT INVENTORY REPORT</div>
            <div class="outline-box">CREATIVE ARTS SECTION</div>
          </div>
          ` : `<div style="height: 10px;"></div>`}

          <div class="info-container">
            <div class="info-item">
               <span class="label">CATEGORY</span>
               <center><span class="data">${cat.toUpperCase()}</span></center>
            </div>
            <div class="info-item">
               <span class="label">TOTAL ITEMS</span>
               <center><span class="data">${categoryItems.length}</span></center>
            </div>
            <div class="info-item">
               <span class="label">DATE PRINTED</span>
               <center><span class="data">${printedDate}</span></center>
            </div>
          </div>

          <table class="main-grid">
            <thead>
              <tr>
                <th>CODE</th>
                <th>ITEM NAME / DESCRIPTION</th>
                <th>TYPE</th>
                <th>SERIAL NO.</th>
                <th>LOCATION</th>
                <th>STATUS</th>
                <th>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    // Prepare Summary Data Page
    const summaryData = printCategories.map(cat => {
      const catItems = itemsList.filter(i => i.category === cat);
      const working = catItems.filter(i => i.deviceStatus === 'Working').length;
      const repair = catItems.filter(i => i.deviceStatus === 'For Repair').length;
      const missing = catItems.filter(i => i.deviceStatus === 'Missing').length;
      const notWorking = catItems.filter(i => i.deviceStatus === 'Not Working').length;
      const total = catItems.length;
      return { cat, working, repair, missing, notWorking, total };
    });

    const summaryHtml = `
      <div class="page-container">
        <div class="logo-header">
           <img src="/dbpi-logo.png" alt="DON BOSCO PRESS" style="height: 70px; display: block; margin: 0 auto;">
        </div>
        <div class="header-boxes">
          <div class="black-box">EQUIPMENT INVENTORY REPORT - SUMMARY</div>
          <div class="outline-box">CREATIVE ARTS SECTION</div>
        </div>
        
        <table class="main-grid" style="margin-top: 20px;">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th style="text-align: center;">WORKING</th>
              <th style="text-align: center;">FOR REPAIR</th>
              <th style="text-align: center;">NOT WORKING</th>
              <th style="text-align: center;">MISSING</th>
              <th style="text-align: center;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${summaryData.map(row => `
              <tr>
                <td style="font-weight: bold;">${row.cat}</td>
                <td style="text-align: center;">${row.working}</td>
                <td style="text-align: center;">${row.repair}</td>
                <td style="text-align: center;">${row.notWorking}</td>
                <td style="text-align: center;">${row.missing}</td>
                <td style="text-align: center; font-weight: bold; background: #eee;">${row.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="sig-table" style="margin-top: 50px;">
          <tr>
            <td class="sig-cell">
              <div class="sig-label">PREPARED BY:</div>
              <div class="sig-content">
                <div class="sig-line"></div>
                <div class="sig-sub">Name & Signature</div>
              </div>
            </td>
            <td class="sig-cell">
              <div class="sig-label">NOTED BY:</div>
              <div class="sig-content">
                <div class="sig-line"></div>
                <div class="sig-sub">Supervisor</div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Inventory Report</title>
          <style>
            @page { size: landscape; margin: 8mm; }
            body { font-family: 'Helvetica', Arial, sans-serif; margin: 0; padding: 0; color: black; }
            .page-container { page-break-after: always; padding: 10px; position: relative; min-height: 90vh; display: flex; flex-direction: column; }
            .logo-header { text-align: center; margin-bottom: 20px; width: 100%; }
            .header-boxes { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
            .black-box { background: black; color: white; padding: 10px 20px; font-weight: bold; font-size: 12px; text-transform: uppercase; }
            .outline-box { border: 1.5px solid black; background: white; padding: 10px 20px; font-weight: bold; font-size: 12px; text-transform: uppercase; white-space: nowrap; }
            .info-container { display: flex; border: 1.5px solid black; margin-bottom: 15px; }
            .info-item { flex: 1; padding: 8px 12px; border-right: 1.5px solid black; display: flex; flex-direction: column; justify-content: space-between; min-height: 35px; }
            .info-item:last-child { border-right: none; }
            .label { font-size: 10px; font-weight: bold; margin-bottom: 8px; color: #333; }
            .data { font-size: 10px; font-weight: bold; }
            .main-grid { width: 100%; border-collapse: collapse; border: 1.5px solid black; margin-bottom: 15px; }
            .main-grid th { border: 1.5px solid black; padding: 6px 8px; font-size: 10px; background: #eee; text-align: left; font-weight: bold; }
            .main-grid td { border: 1.5px solid black; padding: 6px 8px; font-size: 10px; height: 24px; vertical-align: middle; }
            .sig-table { width: 100%; border-collapse: collapse; border: 1.5px solid black; table-layout: fixed; page-break-inside: avoid; }
            .sig-cell { width: 50%; border: 1.5px solid black; padding: 10px; vertical-align: top; height: 110px; }
            .sig-label { font-size: 10px; font-weight: bold; text-align: left; margin-bottom: 5px; }
            .sig-content { width: 80%; margin: 0 auto; text-align: center; }
            .sig-line { border-bottom: 1px solid black; margin-top: 60px; margin-bottom: 4px; }
            .sig-sub { font-size: 10px; font-weight: bold; font-style: italic; text-align: center; }
            @media print {
              .black-box { background-color: black !important; -webkit-print-color-adjust: exact; }
              .main-grid th { background-color: #eee !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
          ${summaryHtml}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- EFFECT: MODAL SCROLL LOCK ---
  useEffect(() => {
    const isAnyModalOpen = isModalOpen || isQRModalOpen || isViewModalOpen || showLogoutConfirm || showDeleteConfirm || showSaveConfirm || explicitSaveConfirm || logInlineToDelete !== null || editFormLogToDelete !== null;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen, isQRModalOpen, isViewModalOpen, showLogoutConfirm, showDeleteConfirm, showSaveConfirm, explicitSaveConfirm, logInlineToDelete, editFormLogToDelete]);

  // --- HANDLERS ---
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const initiateSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isReviewStep) {
      const formData = new FormData(e.currentTarget);
      const data: any = Object.fromEntries(formData.entries());
      if (!isBatchMode) {
        data.maintenanceLogs = editMaintenanceLogs;
      }
      setReviewData(data); 
      setIsReviewStep(true);
    } else {
      setShowSaveConfirm(true);
    }
  };

  const confirmExplicitSave = async () => {
    if (editingExplicit && selectedItem) {
      setIsSaving(true);
      await handleInlineUpdate(selectedItem, editingExplicit.field, editingExplicit.value);
      setEditingExplicit(null);
      setExplicitSaveConfirm(false);
      setIsSaving(false);
    }
  };

  const confirmDeleteLogInline = async () => {
    if (logInlineToDelete !== null && selectedItem) {
      setIsSaving(true);
      const newLogs = (selectedItem.maintenanceLogs || []).filter((_: any, i: number) => i !== logInlineToDelete);
      await handleInlineUpdate(selectedItem, 'maintenanceLogs', newLogs);
      setLogInlineToDelete(null);
      setIsSaving(false);
    }
  };

  const confirmDeleteEditFormLog = () => {
    if (editFormLogToDelete !== null) {
      setEditMaintenanceLogs(editMaintenanceLogs.filter((_, i) => i !== editFormLogToDelete));
      setEditFormLogToDelete(null);
    }
  };

  const confirmSave = async () => {
    if (!reviewData) return;
    setIsSaving(true);

    try {
      let success = true;
      if (Array.isArray(reviewData)) {
        const savePromises = reviewData.map(item => addItem({ ...item, category: item.category || activeCategory }));
        const results = await Promise.all(savePromises);
        if (results.some(res => !res.success)) success = false;
      } else {
        const payload = { ...reviewData, category: reviewData.category || activeCategory };
        const res = selectedItem 
          ? await updateItem(selectedItem.id, payload) 
          : await addItem(payload);
        if (!res.success) success = false;
      }

      if (success) {
        setShowSaveConfirm(false);
        setIsModalOpen(false);
        setIsReviewStep(false); 
        setReviewData(null);
        setIsBatchMode(false);
        setEditMaintenanceLogs([]);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        fetchAllData(); 
      } else {
        alert("Failed to save some records.");
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInlineUpdate = async (targetItem: any, field: string, newValue: any) => {
    if (newValue === undefined || !targetItem) return;

    setIsSaving(true);
    let updatedFields: any = { [field]: newValue };
    if (field === "deviceStatus") {
      updatedFields.availabilityStatus = newValue === "Working" ? "Available" : "Unavailable";
    }

    try {
      const res = await updateItem(targetItem.id, { ...targetItem, ...updatedFields, category: targetItem.category });
      if (res.success) {
        setItemsList(prev => prev.map(item => (item.id === targetItem.id && item.category === targetItem.category) ? { ...item, ...updatedFields } : item));
        
        if (selectedItem && selectedItem.id === targetItem.id && selectedItem.category === targetItem.category) {
            setSelectedItem({ ...selectedItem, ...updatedFields });
        }
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInlineUpdatesMulti = async (targetItem: any, updates: any) => {
    if (!targetItem || !updates) return;
    setIsSaving(true);
    let payload = { ...updates };
    if (updates.deviceStatus) {
      payload.availabilityStatus = updates.deviceStatus === "Working" ? "Available" : "Unavailable";
    }
    try {
      const res = await updateItem(targetItem.id, { ...targetItem, ...payload, category: targetItem.category });
      if (res.success) {
        setItemsList(prev => prev.map(item => (item.id === targetItem.id && item.category === targetItem.category) ? { ...item, ...payload } : item));
        if (selectedItem && selectedItem.id === targetItem.id && selectedItem.category === targetItem.category) {
            setSelectedItem({ ...selectedItem, ...payload });
        }
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg") as SVGGraphicsElement | null;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const targetSize = 1080;
    const margin = 100;
    const qrSize = targetSize - (margin * 2);

    img.onload = () => {
      canvas.width = targetSize;
      canvas.height = targetSize;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, targetSize, targetSize);
        ctx.drawImage(img, margin, margin, qrSize, qrSize);
      }
      const pngFile = canvas.toDataURL("image/png", 1.0);
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${selectedItem?.itemCode || 'code'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
    const totalCols = 8; 
    switch (e.key) {
      case "ArrowRight": e.preventDefault(); document.getElementById(`cell-${rowIndex}-${(colIndex + 1) % totalCols}`)?.focus(); break;
      case "ArrowLeft": e.preventDefault(); document.getElementById(`cell-${rowIndex}-${(colIndex - 1 + totalCols) % totalCols}`)?.focus(); break;
      case "ArrowDown": e.preventDefault(); document.getElementById(`cell-${(rowIndex + 1) % filteredItems.length}-${colIndex}`)?.focus(); break;
      case "ArrowUp": e.preventDefault(); document.getElementById(`cell-${(rowIndex - 1 + filteredItems.length) % filteredItems.length}-${colIndex}`)?.focus(); break;
      case "Enter":
        e.preventDefault();
        const doubleClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true, view: window });
        e.currentTarget.dispatchEvent(doubleClickEvent);
        break;
    }
  };

  const handleDelete = async () => {
    if (selectedItem) {
      const res = await deleteItem(selectedItem.id, selectedItem.category);
      if (res.success) {
        setShowDeleteConfirm(false);
        setIsModalOpen(false);
        fetchAllData();
      }
    }
  };

  const updateMaintenanceLogInline = async (index: number, field: string, newValue: string) => {
    const newLogs = [...(selectedItem.maintenanceLogs || [])];
    newLogs[index] = { ...newLogs[index], [field]: newValue };
    await handleInlineUpdate(selectedItem, 'maintenanceLogs', newLogs);
  };

  const addMaintenanceLogInline = async () => {
    const newLogs = [...(selectedItem.maintenanceLogs || []), { date: '', activity: '', status: 'Ongoing', center: '' }];
    await handleInlineUpdate(selectedItem, 'maintenanceLogs', newLogs);
  };

  const removeMaintenanceLogInline = (index: number) => {
    setLogInlineToDelete(index);
  };

  const updateEditLog = (index: number, field: string, val: string) => {
    const newLogs = [...editMaintenanceLogs];
    newLogs[index][field] = val;
    setEditMaintenanceLogs(newLogs);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBFF]">
      <div className="w-12 h-12 border-4 border-[#E2E2E6] border-t-[#005FB7] rounded-full animate-spin mb-4"></div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#FDFBFF] text-[#1A1C1E] font-sans overflow-x-hidden">
  
  {/* SIDEBAR */}
      <aside 
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-50 bg-[#F7F9FF] border-r border-[#E0E2EC] transition-all duration-300 ease-in-out lg:translate-x-0 shadow-xl lg:shadow-none
          ${sidebarMinimized ? "lg:w-20 w-72" : "w-72"} 
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3">
            <button 
              onClick={() => setSidebarMinimized(!sidebarMinimized)}
              className="p-2 hover:bg-[#EDF0F7] rounded-lg cursor-pointer transition-colors hidden lg:block"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-2 cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            {(!sidebarMinimized || mobileMenuOpen) && (
              <h2 className="font-bold text-[#005FB7] text-sm whitespace-nowrap lg:block hidden">Inventory Dashboard</h2>
            )}
            <h2 className="font-bold text-[#005FB7] text-sm whitespace-nowrap lg:hidden">Inventory Dashboard</h2>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {[
              { label: "Inventory", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z", active: true, action: () => setMobileMenuOpen(false) },
              { label: "Log Book", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6", action: () => router.push("/dashboard/logbook") },
              { label: "Verify", icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3", action: () => router.push("/") }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className={`relative w-full flex items-center gap-4 p-3.5 rounded-xl transition-all cursor-pointer group
                  ${item.active ? "bg-[#D6E3FF] text-[#001B3E]" : "text-[#44474E] hover:bg-[#EDF0F7]"}
                  ${sidebarMinimized ? "lg:justify-center justify-start" : "justify-start"}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                <span className={`font-semibold text-xs whitespace-nowrap ${sidebarMinimized ? "lg:hidden block" : "block"}`}>
                  {item.label}
                </span>
                {sidebarMinimized && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#001B3E] text-white text-xs font-bold rounded-md opacity-0 invisible lg:group-hover:opacity-100 lg:group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] shadow-2xl pointer-events-none hidden lg:block">
                    {item.label}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#001B3E] rotate-45" />
                  </div>
                )}
              </button>
            ))}
          </nav>

          <div className="p-3 mt-auto">
            <button 
              onClick={() => setShowLogoutConfirm(true)} 
              className={`relative w-full flex items-center gap-4 p-3.5 rounded-xl text-[#BA1A1A] hover:bg-[#FFDAD6] transition-all cursor-pointer font-bold group ${sidebarMinimized ? "lg:justify-center justify-start" : "justify-start"}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span className={`text-xs cursor-pointer ${sidebarMinimized ? "lg:hidden block" : "block"}`}>Sign Out</span>
              {sidebarMinimized && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#BA1A1A] text-white text-xs font-bold rounded-md opacity-0 invisible lg:group-hover:opacity-100 lg:group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] shadow-2xl pointer-events-none hidden lg:block">
                  Sign Out
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#BA1A1A] rotate-45" />
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>
  
  {/* MAIN CONTENT */}
<main className={`relative flex-1 transition-all duration-300 min-w-0 ${sidebarMinimized ? "lg:ml-20" : "lg:ml-72"}`}>
  
  {/* NOTIFICATION BANNER PILL */}
  {showSuccessToast && (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
      <div className="bg-[#1A1C1E] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md">
        <div className="bg-[#C4EED0] p-1 rounded-full">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#002107" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span className="text-sm font-bold whitespace-nowrap">Dashboard Changes Saved</span>
      </div>
    </div>
  )}

  {/* HEADER */}
  <header className="sticky top-0 z-40 bg-[#FDFBFF]/90 backdrop-blur-xl border-b border-[#E0E2EC] h-20 flex items-center px-4 md:px-8">
    <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 mr-3 text-[#44474E] cursor-pointer hover:bg-[#F1F3F8] rounded-full transition-colors">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <div className="flex-1 flex justify-center">
      <div className="relative w-full max-w-xl group">
        <input 
          type="text" 
          placeholder="Search all inventory items..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#F1F3F8] border-none text-sm rounded-full py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-[#005FB7] focus:bg-white transition-all outline-none font-medium cursor-text" 
        />
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-[#44474E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>
    </div>
  </header>

  <div className="p-4 md:p-8">
    {/* CATEGORIES & ACTIONS */}
    <div className="flex flex-col md:flex-row md:items-start lg:items-end justify-between gap-4 mb-8 border-b border-[#E0E2EC]">
      
      {/* TEXT DROPDOWN CATEGORY */}
      <div className="flex items-center gap-2 pb-2 md:pb-4">
        <div className="relative flex items-center group">
          <select 
            value={activeCategory} 
            onChange={(e) => {
              setActiveCategory(e.target.value);
              setSearchQuery(""); // Clear search when manually changing category
            }}
            className="appearance-none bg-transparent pr-10 py-1 text-lg md:text-xl font-bold text-[#1A1C1E] outline-none cursor-pointer hover:text-[#005FB7] transition-all border-none focus:ring-0"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <div className="absolute right-2 pointer-events-none text-[#005FB7] group-hover:translate-y-0.5 transition-transform">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* ACTIONS CONTAINER */}
      <div className="flex flex-row items-center gap-3 pb-4 w-full md:w-auto">
        <div className="flex items-center gap-2 bg-[#F1F3F8] px-4 py-2 rounded-xl border border-transparent hover:border-[#E0E2EC] transition-all hidden lg:flex">
          <span className="text-xs font-bold text-[#74777F] uppercase">Sort:</span>
          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-transparent text-xs font-bold text-[#005FB7] outline-none cursor-pointer uppercase"
          >
            <option value="itemCode">Item Code (A-Z)</option>
            <option value="oldest">Oldest First</option>
            <option value="newest">Newest First</option>
            {sortOrder === "custom" && <option value="custom">Custom Column</option>}
          </select>
        </div>

        <button 
          onClick={handlePrintAll} 
          className="flex-1 sm:flex-none bg-white border border-[#E0E2EC] text-[#44474E] px-4 sm:px-5 py-3.5 rounded-full text-sm font-bold uppercase shadow-sm hover:bg-[#F1F3F8] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span className="truncate">Print Report</span>
        </button>

        <button 
          onClick={() => {
            setSelectedItem(null); 
            setReviewData(null);
            setTempGdriveLink("");
            setIsModalOpen(true);
          }}
          className="flex-1 sm:flex-none bg-[#005FB7] text-white px-4 sm:px-8 py-3.5 rounded-full text-sm font-bold uppercase shadow-lg hover:bg-[#004ba0] transition-all cursor-pointer flex items-center justify-center whitespace-nowrap active:scale-95"
        >
          + Add Item
        </button>
      </div>
    </div>

    {/* DATA CONTAINER */}
    <div className="bg-white rounded-xl md:rounded-2xl border border-[#E0E2EC] overflow-hidden shadow-sm">
      
     {/* SORTABLE DESKTOP HEADER */}
<div className="hidden lg:grid grid-cols-[0.8fr_2.5fr_1fr_1.2fr_1fr_1.2fr_1.2fr_1.5fr] gap-3 bg-[#F7F9FF] px-8 py-5 text-xs font-bold text-[#74777F] uppercase border-b border-[#E0E2EC]">
  
  {[
    { label: "Item Code", key: "itemCode" },
    { label: "Item Name", key: "itemName" },
    { label: "Item Type", key: "itemType" },
    { label: "Serial No.", key: "serialNumber" },
    { label: "Location", key: "locationStored" },
    { label: "Status", key: "deviceStatus" },
    { label: "Availability", key: "availabilityStatus", center: true }
  ].map((header) => {
    const isActive = sortConfig.key === header.key;
    return (
      <div 
        key={header.key}
        onClick={() => requestSort(header.key)}
        className={`flex items-center gap-1.5 cursor-pointer hover:text-[#005FB7] transition-colors group/h ${header.center ? "justify-center" : ""}`}
      >
        <span className="select-none cursor-pointer">{header.label}</span>
        <div className="flex flex-col -space-y-0.5">
          <svg 
            className={`w-2.5 h-2.5 transition-all ${
              isActive && sortConfig.direction === 'asc' 
                ? 'text-[#005FB7] opacity-100 scale-110' 
                : 'text-[#74777F] opacity-30 group-hover/h:opacity-50'
            }`} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 8l-6 6h12l-6-6z"/>
          </svg>
          <svg 
            className={`w-2.5 h-2.5 transition-all ${
              isActive && sortConfig.direction === 'desc' 
                ? 'text-[#005FB7] opacity-100 scale-110' 
                : 'text-[#74777F] opacity-30 group-hover/h:opacity-50'
            }`} 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 16l6-6H6l6 6z"/>
          </svg>
        </div>
      </div>
    );
  })}
  <div className="text-right">Actions</div>
</div>

      <div className="divide-y divide-[#E0E2EC]">
        {filteredItems.map((item, rowIndex) => (
          <div key={`${item.category}-${item.id}`} className={`transition-colors group ${(item.deviceStatus === 'Not Working' || item.deviceStatus === 'For Repair' || item.deviceStatus === 'Missing') ? 'bg-[#fceae6] hover:bg-[#fad8d1]' : 'hover:bg-[#F8FAFF]'}`}>
            {/* DESKTOP ROW VIEW */}
            <div className="hidden lg:grid grid-cols-[0.8fr_2.5fr_1fr_1.2fr_1fr_1.2fr_1.2fr_1.5fr] gap-3 items-center px-8 py-6">
              <div id={`cell-${rowIndex}-0`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 0)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.itemCode} field="itemCode" item={item} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <div className="font-bold text-xs text-[#005FB7] bg-[#D6E3FF] px-2 py-1 rounded w-fit select-none cursor-pointer">{item.itemCode}</div>
                </EditableCell>
              </div>

              <div id={`cell-${rowIndex}-1`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 1)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <NameInclusionsCell item={item} onUpdateMulti={handleInlineUpdatesMulti} />
              </div>

              <div id={`cell-${rowIndex}-2`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 2)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.itemType} field="itemType" item={item} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <div className="text-sm text-[#44474E] select-none cursor-pointer">{item.itemType || "—"}</div>
                </EditableCell>
              </div>

              <div id={`cell-${rowIndex}-3`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 3)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.serialNumber} field="serialNumber" item={item} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <div className="font-bold text-xs text-[#44474E] break-all whitespace-normal select-none cursor-pointer">{item.serialNumber || "N/A"}</div>
                </EditableCell>
              </div>

              <div id={`cell-${rowIndex}-4`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 4)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.locationStored} field="locationStored" item={item} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <div className="text-sm text-[#44474E] select-none cursor-pointer">{item.locationStored || "—"}</div>
                </EditableCell>
              </div>

              <div id={`cell-${rowIndex}-5`} tabIndex={0} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <select 
                  value={item.deviceStatus || "Working"}
                  onChange={(e) => handleInlineUpdate(item, "deviceStatus", e.target.value)}
                  className={`text-xs font-bold uppercase outline-none cursor-pointer bg-transparent hover:bg-white hover:ring-1 hover:ring-[#E0E2EC] p-1 rounded transition-all w-full ${item.deviceStatus === 'Working' ? 'text-green-600' : 'text-[#980000]'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {["Working", "For Repair", "Not Working", "Missing"].map(opt => (
                    <option key={opt} value={opt} className="text-[#1A1C1E] cursor-pointer">{opt}</option>
                  ))}
                </select>
              </div>

              <div className="text-center w-full block">
                <span className={`text-xs font-bold px-4 py-1.5 rounded-full uppercase ${
                  item.availabilityStatus === 'Available' ? 'bg-[#C4EED0] text-[#002107]' : 'bg-[#E2E2E6] text-[#1A1C1E]'
                }`}>
                  {item.availabilityStatus}
                </span>
              </div>
              
              <div className="flex items-center justify-end gap-2 w-full cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => {setSelectedItem(item); setIsViewModalOpen(true);}} className="text-xs font-bold uppercase text-[#005FB7] hover:underline cursor-pointer mr-1">View Record</button>
                <div className="w-[1px] h-3 bg-[#E0E2EC] mx-1"></div>
                <button onClick={() => { const url = `${window.location.origin}/?c=${item.itemCode}`; setQrValue(url); setSelectedItem(item); setIsQRModalOpen(true); }} className="p-1.5 text-[#005FB7] hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-[#E0E2EC]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                </button>
                <button onClick={() => {setSelectedItem(item); setIsModalOpen(true);}} className="p-1.5 text-[#005FB7] hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-[#E0E2EC]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="lg:hidden p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1 w-full">
                  <EditableCell value={item.itemCode} field="itemCode" item={item} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <span className="text-xs font-bold text-[#005FB7] bg-[#D6E3FF] px-2 py-0.5 rounded uppercase cursor-pointer w-fit block">{item.itemCode}</span>
                  </EditableCell>
                  <NameInclusionsCell item={item} onUpdateMulti={handleInlineUpdatesMulti} />
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase shrink-0 ${item.availabilityStatus === 'Available' ? 'bg-[#C4EED0] text-[#002107]' : 'bg-[#E2E2E6] text-[#1A1C1E]'}`}>{item.availabilityStatus}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#F1F3F8]">
                <div className="w-full">
                  <p className="text-xs font-bold text-[#74777F] uppercase mb-1">Type / Serial</p>
                  <EditableCell value={item.itemType} field="itemType" item={item} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <p className="text-sm font-bold text-[#44474E] cursor-pointer block w-full">{item.itemType || "—"}</p>
                  </EditableCell>
                  <EditableCell value={item.serialNumber} field="serialNumber" item={item} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <p className="text-xs font-bold text-[#74777F] cursor-pointer break-all block w-full mt-1">{item.serialNumber || "No Serial"}</p>
                  </EditableCell>
                </div>
                <div className="w-full">
                  <p className="text-xs font-bold text-[#74777F] uppercase mb-1">Status</p>
                  <select value={item.deviceStatus || "Working"} onChange={(e) => handleInlineUpdate(item, "deviceStatus", e.target.value)} className={`text-sm font-bold uppercase outline-none cursor-pointer bg-transparent w-full ${item.deviceStatus === 'Working' ? 'text-green-600' : 'text-[#980000]'}`}>
                    {["Working", "For Repair", "Not Working", "Missing"].map(opt => (
                      <option key={opt} value={opt} className="text-[#1A1C1E]">{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full">
                  <p className="text-xs font-bold text-[#74777F] uppercase mb-1">Location</p>
                  <EditableCell value={item.locationStored} field="locationStored" item={item} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <p className="text-sm font-bold text-[#44474E] cursor-pointer block w-full">{item.locationStored || "—"}</p>
                  </EditableCell>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => {setSelectedItem(item); setIsViewModalOpen(true);}} className="w-full bg-[#F1F3F8] py-3 rounded-xl text-sm font-bold uppercase text-[#005FB7] cursor-pointer">View Remarks & Logs</button>
                <div className="flex gap-2">
                  <button onClick={() => { const url = `${window.location.origin}/?c=${item.itemCode}`; setQrValue(url); setSelectedItem(item); setIsQRModalOpen(true); }} className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#E0E2EC] py-3 rounded-xl text-sm font-bold uppercase text-[#005FB7] cursor-pointer shadow-sm active:bg-[#F7F9FF]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    View QR Code
                  </button>
                  <button onClick={() => {setSelectedItem(item); setIsModalOpen(true);}} className="flex-1 flex items-center justify-center gap-2 bg-[#005FB7] text-white py-3 rounded-xl text-sm font-bold uppercase cursor-pointer shadow-md">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
</main>

      {/* CONFIRMATION MODALS */}
      {showLogoutConfirm && <ConfirmModal title="Sign Out" msg="Are you sure you want to end your session?" onConfirm={handleLogout} onCancel={() => setShowLogoutConfirm(false)} type="danger" />}
{showDeleteConfirm && (
  <ConfirmModal
    title="Delete Item"
    msg="Are you sure? This action cannot be undone."
    onConfirm={handleDelete}
    onCancel={() => setShowDeleteConfirm(false)}
    type="danger"
    isSaving={isSaving} 
  />
)}

{showSaveConfirm && (
  <ConfirmModal 
    title="Save Changes" 
    msg="Verify all details before committing to the database." 
    onConfirm={confirmSave} 
    onCancel={() => setShowSaveConfirm(false)} 
    type="primary" 
    isSaving={isSaving} 
  />
)}

{explicitSaveConfirm && (
  <ConfirmModal
    title="Save Changes"
    msg="Are you sure you want to explicitly save these text changes?"
    onConfirm={confirmExplicitSave}
    onCancel={() => setExplicitSaveConfirm(false)}
    type="primary"
    isSaving={isSaving}
  />
)}

{logInlineToDelete !== null && (
  <ConfirmModal
    title="Delete Maintenance Log"
    msg="Are you sure you want to delete this maintenance record?"
    onConfirm={confirmDeleteLogInline}
    onCancel={() => setLogInlineToDelete(null)}
    type="danger"
    isSaving={isSaving}
  />
)}

{editFormLogToDelete !== null && (
  <ConfirmModal
    title="Remove Unsaved Log"
    msg="Remove this log entry from the current form before saving?"
    onConfirm={confirmDeleteEditFormLog}
    onCancel={() => setEditFormLogToDelete(null)}
    type="danger"
  />
)}

{/* VIEW PREVIEW MODAL */}
{isViewModalOpen && selectedItem && (
  <div 
    className="fixed inset-0 bg-[#1A1C1E]/60 flex items-center justify-center z-[100] md:p-4 backdrop-blur-md cursor-pointer"
    onClick={() => {
      setIsViewModalOpen(false);
      setActiveViewTab('description');
      setEditingExplicit(null);
    }} 
  >
    <div 
      className="bg-[#FDFBFF] flex flex-col h-full w-full md:h-[85vh] md:max-w-4xl lg:max-w-6xl rounded-xl shadow-2xl border border-[#E0E2EC] transition-all overflow-hidden font-sans cursor-auto"
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="flex justify-between items-center p-6 md:p-8 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-[#005FB7] rounded-full"></div>
          <h2 className="font-bold text-[#005FB7] text-2xl">Item Specification</h2>
        </div>
        <button 
          onClick={() => {
            setIsViewModalOpen(false);
            setActiveViewTab('description');
            setEditingExplicit(null);
          }} 
          className="p-3 bg-[#F1F3F8] md:bg-transparent md:p-2 rounded-full transition-colors cursor-pointer text-[#44474E] active:scale-90"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="flex gap-6 md:gap-10 px-6 md:px-10 border-b border-[#E0E2EC] bg-white overflow-x-auto no-scrollbar shrink-0 cursor-pointer">
        {[
          { id: 'description', label: 'Item Description' },
          { id: 'usage', label: 'Usage Records' },
          { id: 'maintenance', label: 'Maintenance History' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveViewTab(tab.id)}
            className={`pb-4 text-sm font-bold uppercase transition-all relative whitespace-nowrap cursor-pointer ${
              activeViewTab === tab.id ? "text-[#005FB7]" : "text-[#74777F] hover:text-[#44474E]"
            }`}
          >
            {tab.label}
            {activeViewTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#005FB7] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-white">
        {activeViewTab === 'description' && (
          <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#74777F] uppercase">Item Name</p>
                  <p className="text-lg font-bold text-[#1A1C1E] leading-tight">{selectedItem.itemName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#74777F] uppercase">Item Code</p>
                  <p className="text-base font-bold text-[#005FB7]">{selectedItem.itemCode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#74777F] uppercase">Category</p>
                  <p className="text-base font-bold text-[#1A1C1E]">{selectedItem.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#74777F] uppercase">Serial Number</p>
                  <p className="text-base font-bold text-[#1A1C1E]">{selectedItem.serialNumber || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#74777F] uppercase">Condition</p>
                  <p className={`text-base font-bold uppercase ${selectedItem.deviceStatus === 'Working' ? 'text-green-600' : 'text-[#980000]'}`}>{selectedItem.deviceStatus}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#74777F] uppercase">Availability</p>
                  <p className={`text-base font-bold uppercase ${selectedItem.availabilityStatus === 'Available' ? 'text-[#005FB7]' : 'text-[#74777F]'}`}>{selectedItem.availabilityStatus}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#74777F] uppercase">Storage Location</p>
                  <p className="text-base font-bold text-[#1A1C1E]">{selectedItem.locationStored || "—"}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-[#F1F3F8] space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-[#74777F] uppercase mb-3">Inclusions</h4>
                  {editingExplicit?.field === 'inclusions' ? (
                    <div className="space-y-3">
                      <textarea
                        autoFocus
                        value={editingExplicit.value}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.length === 1 && val !== '•' && val !== '\n') {
                            val = '• ' + val;
                          }
                          setEditingExplicit({ ...editingExplicit, value: val });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const start = e.currentTarget.selectionStart;
                            const end = e.currentTarget.selectionEnd;
                            const val = e.currentTarget.value;
                            const newVal = val.substring(0, start) + '\n• ' + val.substring(end);
                            setEditingExplicit({ ...editingExplicit, value: newVal });
                            setTimeout(() => {
                              const target = e.target as HTMLTextAreaElement;
                              target.selectionStart = target.selectionEnd = start + 3;
                            }, 0);
                          }
                        }}
                        className="w-full bg-white border-2 border-[#005FB7] rounded px-3 py-2 text-base outline-none shadow-sm text-black cursor-text min-h-[120px] resize-y leading-relaxed"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setExplicitSaveConfirm(true)} className="px-4 py-2 bg-[#005FB7] text-white text-xs font-bold uppercase rounded-md shadow hover:bg-[#004ba0] cursor-pointer">Save</button>
                        <button onClick={() => setEditingExplicit(null)} className="px-4 py-2 bg-[#F1F3F8] text-[#44474E] text-xs font-bold uppercase rounded-md shadow hover:bg-[#E0E2EC] cursor-pointer">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => setEditingExplicit({ field: 'inclusions', value: selectedItem.inclusions || "" })} className="text-base text-[#44474E] leading-loose max-w-full whitespace-pre-wrap break-words cursor-pointer p-3 hover:bg-[#F7F9FF] rounded-lg transition-colors border border-transparent hover:border-[#E0E2EC]">
                      {selectedItem.inclusions ? (
                        <span>{selectedItem.inclusions}</span>
                      ) : (
                        <span className="text-[#8E9199] italic">Click to edit inclusions...</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#74777F] uppercase mb-3">Remarks</h4>
                  {editingExplicit?.field === 'remarks' ? (
                    <div className="space-y-3">
                      <textarea
                        autoFocus
                        value={editingExplicit.value}
                        onChange={(e) => setEditingExplicit({ ...editingExplicit, value: e.target.value })}
                        className="w-full bg-white border-2 border-[#005FB7] rounded px-3 py-2 text-base outline-none shadow-sm text-black cursor-text min-h-[120px] resize-y leading-relaxed"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setExplicitSaveConfirm(true)} className="px-4 py-2 bg-[#005FB7] text-white text-xs font-bold uppercase rounded-md shadow hover:bg-[#004ba0] cursor-pointer">Save</button>
                        <button onClick={() => setEditingExplicit(null)} className="px-4 py-2 bg-[#F1F3F8] text-[#44474E] text-xs font-bold uppercase rounded-md shadow hover:bg-[#E0E2EC] cursor-pointer">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => setEditingExplicit({ field: 'remarks', value: selectedItem.remarks || "" })} className="text-base text-[#44474E] leading-loose max-w-full whitespace-pre-wrap break-words cursor-pointer p-3 hover:bg-[#F7F9FF] rounded-lg transition-colors border border-transparent hover:border-[#E0E2EC]">
                      {selectedItem.remarks ? (
                        <span className="italic">{selectedItem.remarks}</span>
                      ) : (
                        <span className="text-[#8E9199] italic">Click to edit remarks...</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:border-l lg:pl-10 border-[#E0E2EC]">
              <p className="text-sm font-bold text-[#74777F] uppercase mb-4">Document Preview</p>
              {(() => {
                const rawLink = selectedItem?.gdriveLink;
                const fileIdMatch = rawLink?.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
                const fileId = fileIdMatch ? fileIdMatch[1] : null;

                if (fileId) {
                  return (
                    <div className="w-full space-y-4">
                      <div className="relative w-full aspect-[1/1.3] overflow-hidden rounded-lg border border-[#E0E2EC] bg-[#F1F3F8] shadow-sm">
                        <iframe src={`https://drive.google.com/file/d/${fileId}/preview`} className="absolute top-0 left-0 w-full h-full border-0" allow="autoplay"></iframe>
                      </div>
                      <a href={rawLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#F1F3F8] text-[#005FB7] px-6 py-4 rounded-xl text-sm font-bold uppercase hover:bg-[#D6E3FF] transition-all cursor-pointer justify-center">Open in New Tab</a>
                    </div>
                  );
                }
                return (
                  <div className="w-full aspect-[1/1.3] flex flex-col items-center justify-center text-[#74777F] bg-[#F7F9FF] rounded-lg border-2 border-dashed border-[#E0E2EC] p-10">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-20"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                    <p className="text-sm font-bold uppercase text-center">No document attached</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeViewTab === 'usage' && (
          <div className="animate-in fade-in duration-300">
            <h3 className="text-lg font-bold text-[#1A1C1E] mb-6 border-b border-[#F1F3F8] pb-2">{selectedItem.itemName}</h3>
            <div className="border border-[#E0E2EC] rounded-lg overflow-hidden">
              <table className="w-full text-left text-base">
                <thead className="bg-[#F7F9FF] text-[#74777F] font-bold uppercase text-sm">
                  <tr>
                    <th className="px-6 py-4">Purpose Title</th>
                    <th className="px-6 py-4">Requestor</th>
                    <th className="px-6 py-4 text-center">Date Requested</th>
                    <th className="px-6 py-4 text-center">Date Returned</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F8]">
                  {(() => {
                    const logsArray = Array.isArray(logs) ? logs : (logs as any)?.data || [];
                    const itemLogs = logsArray.filter((log: any) => log.itemId === selectedItem.id);
                    if (itemLogs.length === 0) return <tr><td colSpan={5} className="px-6 py-12 text-center text-[#74777F] italic text-base">No records found.</td></tr>;
                    return itemLogs.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F7F9FF] transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-bold text-[#1A1C1E] text-base">{log.purposeTitle}</td>
                        <td className="px-6 py-4 text-base text-[#44474E]">{log.requestorName || log.borrowerName || "—"}</td>
                        <td className="px-6 py-4 text-center text-[#44474E]">{log.dateRequested?.split(/[T ]/)[0] || "—"}</td>
                        <td className="px-6 py-4 text-center text-[#44474E]">{log.displayReturnDate || log.dateReturned?.split(/[T ]/)[0] || "—"}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1.5 rounded-full font-bold text-xs uppercase ${log.dateReturned ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {log.dateReturned ? "Returned" : "Ongoing"}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeViewTab === 'maintenance' && (
          <div className="animate-in fade-in duration-300 space-y-6">
            <h3 className="text-lg font-bold text-[#1A1C1E] mb-2 border-b border-[#F1F3F8] pb-2">{selectedItem.itemName}</h3>
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-[#74777F] uppercase">Maintenance History</p>
              <button onClick={addMaintenanceLogInline} className="text-sm font-bold bg-[#D6E3FF] text-[#005FB7] px-4 py-2 rounded-full uppercase cursor-pointer hover:bg-[#005FB7] hover:text-white transition-colors">+ Add Record</button>
            </div>
            
            <div className="border border-[#E0E2EC] rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left text-base">
                <thead className="bg-[#F7F9FF] text-[#74777F] font-bold uppercase text-sm">
                  <tr>
                    <th className="px-6 py-4 w-[15%]">Date</th>
                    <th className="px-6 py-4 w-[35%]">Activity / Service</th>
                    <th className="px-6 py-4 w-[15%]">Status</th>
                    <th className="px-6 py-4 w-[25%]">Service Center</th>
                    <th className="px-6 py-4 w-[10%] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F8]">
                  {(!selectedItem.maintenanceLogs || selectedItem.maintenanceLogs.length === 0) ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-[#74777F] italic text-base">No maintenance records added.</td></tr>
                  ) : (
                    selectedItem.maintenanceLogs.map((log: any, index: number) => (
                      <tr key={index} className="hover:bg-[#F7F9FF] transition-colors">
                        <td className="p-2 px-6">
                          <EditableCell value={log.date} field="date" item={selectedItem} type="date" editTrigger="doubleClick" onUpdate={(_item: any, _field: any, val: string) => updateMaintenanceLogInline(index, 'date', val)}>
                            <span className="cursor-pointer block w-full text-[#1A1C1E]">{log.date || "YYYY-MM-DD"}</span>
                          </EditableCell>
                        </td>
                        <td className="p-2 px-6">
                          <EditableCell value={log.activity} field="activity" item={selectedItem} type="text" editTrigger="doubleClick" onUpdate={(_item: any, _field: any, val: string) => updateMaintenanceLogInline(index, 'activity', val)}>
                            <span className="cursor-pointer block w-full text-[#1A1C1E]">{log.activity || "Double-click to edit..."}</span>
                          </EditableCell>
                        </td>
                        <td className="p-2 px-6">
                          <EditableCell value={log.status} field="status" item={selectedItem} type="select" options={['Done', 'Ongoing', 'For claiming']} editTrigger="click" onUpdate={(_item: any, _field: any, val: string) => updateMaintenanceLogInline(index, 'status', val)}>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase cursor-pointer ${log.status === 'Done' ? 'bg-green-100 text-green-700' : log.status === 'Ongoing' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{log.status}</span>
                          </EditableCell>
                        </td>
                        <td className="p-2 px-6">
                          <EditableCell value={log.center} field="center" item={selectedItem} type="text" editTrigger="doubleClick" onUpdate={(_item: any, _field: any, val: string) => updateMaintenanceLogInline(index, 'center', val)}>
                            <span className="cursor-pointer block w-full text-[#1A1C1E]">{log.center || "Double-click to edit..."}</span>
                          </EditableCell>
                        </td>
                        <td className="p-2 px-6 text-center">
                          <button onClick={() => removeMaintenanceLogInline(index)} className="text-[#BA1A1A] hover:text-[#93000A] p-3 rounded-full hover:bg-[#FFDAD6] transition-colors cursor-pointer">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {selectedItem.maintenanceRecords !== undefined && (
              <div className="mt-8 bg-[#F7F9FF] border border-[#E0E2EC] p-6 rounded-lg">
                <p className="text-sm font-bold text-[#74777F] uppercase mb-2">Legacy Notes</p>
                {editingExplicit?.field === 'maintenanceRecords' ? (
                  <div className="space-y-3">
                    <textarea
                      autoFocus
                      value={editingExplicit.value}
                      onChange={(e) => setEditingExplicit({ ...editingExplicit, value: e.target.value })}
                      className="w-full bg-white border-2 border-[#005FB7] rounded px-3 py-2 text-base outline-none shadow-sm text-black cursor-text min-h-[120px] resize-y leading-relaxed"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setExplicitSaveConfirm(true)} className="px-4 py-2 bg-[#005FB7] text-white text-xs font-bold uppercase rounded-md shadow hover:bg-[#004ba0] cursor-pointer">Save</button>
                      <button onClick={() => setEditingExplicit(null)} className="px-4 py-2 bg-[#F1F3F8] text-[#44474E] text-xs font-bold uppercase rounded-md shadow hover:bg-[#E0E2EC] cursor-pointer">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setEditingExplicit({ field: 'maintenanceRecords', value: selectedItem.maintenanceRecords || "" })} className="text-base text-[#44474E] leading-relaxed whitespace-pre-wrap cursor-pointer p-3 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#E0E2EC]">
                    {selectedItem.maintenanceRecords || <span className="text-[#8E9199] italic">Click to edit legacy notes...</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 border-t border-[#F1F3F8] bg-white shrink-0 flex flex-col md:flex-row gap-4 md:justify-end">
        <button onClick={() => { setIsModalOpen(true); }} className="w-full md:w-auto px-8 bg-[#F1F3F8] text-[#1A1C1E] py-4 rounded-full font-bold text-sm uppercase hover:bg-[#E0E2EC] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95">Edit Item</button>
        <button onClick={() => { const url = `${window.location.origin}/?c=${selectedItem.itemCode}`; setQrValue(url); setSelectedItem(selectedItem); setIsQRModalOpen(true); }} className="w-full md:w-auto px-8 bg-[#F1F3F8] text-[#005FB7] py-4 rounded-full font-bold text-sm uppercase hover:bg-[#D6E3FF] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95">View QR</button>
      </div>
    </div>
  </div>
)}

{/* FORM MODAL (REG/EDIT) */}
{isModalOpen && (
  <div className="fixed inset-0 bg-[#1A1C1E]/60 flex items-center justify-center z-[100] backdrop-blur-md p-4">
    <form 
      id="inventory-form"
      key={selectedItem?.id || (isBatchMode ? 'batch' : 'new_form')} 
      onSubmit={(e) => {
        e.preventDefault();
        if (!isReviewStep) {
          if (isBatchMode) {
            const validItems = batchItems.filter(item => item.itemCode.trim() && item.itemName.trim());
            if (validItems.length > 0) {
              setReviewData(validItems);
              setIsReviewStep(true);
            } else {
              alert("Please enter at least one valid item");
            }
          } else {
            const formData = new FormData(e.currentTarget);
            const data: any = Object.fromEntries(formData.entries());
            data.maintenanceLogs = editMaintenanceLogs; // Inject local array state into formData result
            setReviewData(data);
            setIsReviewStep(true);
          }
        } else {
          initiateSave(e);
        }
      }} 
      className="bg-[#FDFBFF] w-full h-[90vh] md:max-w-6xl lg:max-w-7xl rounded-xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="p-6 md:p-8 border-b border-[#E0E2EC] flex justify-between items-center bg-white shrink-0">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-[#1A1C1E]">
              {isReviewStep ? (isBatchMode ? "Review Batch Items" : "Review Details") : (isBatchMode ? "Batch Table Entry" : (selectedItem ? "Update Item" : "Add Item"))}
            </h2>
            {!selectedItem && !isReviewStep && (
              <button 
                type="button"
                onClick={() => {
                   setIsBatchMode(!isBatchMode);
                   if (!isBatchMode) setBatchItems([{ itemCode: "", itemName: "", itemType: "", serialNumber: "", locationStored: "", deviceStatus: "Working", category: activeCategory !== "All" ? activeCategory : "", availabilityStatus: "Available", inclusions: "" }]);
                }}
                className="text-xs font-bold px-4 py-2 bg-[#D6E3FF] text-[#005FB7] rounded-full uppercase hover:bg-[#005FB7] hover:text-white transition-all cursor-pointer"
              >
                {isBatchMode ? "Switch to Single Form" : "Switch to Batch Table"}
              </button>
            )}
          </div>
          {isReviewStep && <p className="text-sm text-[#74777F] font-bold uppercase mt-1">Please verify information</p>}
        </div>
        <button type="button" disabled={isSaving} onClick={() => { setIsModalOpen(false); setIsReviewStep(false); setReviewData(null); setIsBatchMode(false); }} className="p-4 hover:bg-[#F1F3F8] rounded-full transition-colors cursor-pointer disabled:opacity-30">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      
      <div className={`flex-1 p-6 md:p-10 overflow-y-auto bg-white/50 transition-all duration-300 ${isSaving ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {!isReviewStep ? (
          isBatchMode ? (
            <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
              <div className="flex justify-between items-center px-1 shrink-0">
                <div><p className="text-sm font-bold text-[#005FB7] uppercase">Bulk Inventory Input</p></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setBatchItems([...batchItems, { itemCode: "", itemName: "", itemType: "", serialNumber: "", locationStored: "", deviceStatus: "Working", category: activeCategory !== "All" ? activeCategory : "", availabilityStatus: "Available", inclusions: "" }])} className="bg-[#005FB7] text-white text-sm font-bold uppercase px-6 py-3 rounded-lg shadow-md hover:bg-[#004ba0] transition-colors cursor-pointer">+ Add Row</button>
                </div>
              </div>

              <div className="border border-[#E0E2EC] rounded-lg overflow-hidden bg-white shadow-sm flex-1 flex flex-col">
                <div className="overflow-auto flex-1 cursor-pointer">
                  <table className="w-full border-collapse table-fixed min-w-[1200px]">
                    <thead className="bg-[#F1F3F8] border-b border-[#E0E2EC] sticky top-0 z-10">
                      <tr>
                        <th className="p-4 text-xs font-bold text-[#74777F] uppercase w-[10%] text-left">Code</th>
                        <th className="p-4 text-xs font-bold text-[#74777F] uppercase w-[18%] text-left">Item Name</th>
                        <th className="p-4 text-xs font-bold text-[#74777F] uppercase w-[10%] text-left">Type</th>
                        <th className="p-4 text-xs font-bold text-[#74777F] uppercase w-[12%] text-left">Serial No.</th>
                        <th className="p-4 text-xs font-bold text-[#74777F] uppercase w-[12%] text-left">Location</th>
                        <th className="p-4 text-xs font-bold text-[#74777F] uppercase w-[15%] text-left">Inclusions</th>
                        <th className="p-4 text-xs font-bold text-[#74777F] uppercase w-[10%] text-left">Status</th>
                        <th className="p-4 text-xs font-bold text-[#74777F] uppercase w-[10%] text-left">Category</th>
                        <th className="p-4 text-xs font-bold text-[#74777F] uppercase w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F3F8]">
                      {batchItems.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-[#F7F9FF] transition-colors">
                          <td className="p-1"><input className="w-full bg-transparent p-3 rounded-lg focus:bg-white outline-none font-bold text-sm cursor-text" value={item.itemCode} onChange={(e) => { const n = [...batchItems]; n[idx].itemCode = e.target.value; setBatchItems(n); }} /></td>
                          <td className="p-1"><input className="w-full bg-transparent p-3 rounded-lg focus:bg-white outline-none text-sm cursor-text" value={item.itemName} onChange={(e) => { const n = [...batchItems]; n[idx].itemName = e.target.value; setBatchItems(n); }} /></td>
                          <td className="p-1"><input className="w-full bg-transparent p-3 rounded-lg focus:bg-white outline-none text-sm cursor-text" value={item.itemType} onChange={(e) => { const n = [...batchItems]; n[idx].itemType = e.target.value; setBatchItems(n); }} /></td>
                          <td className="p-1"><input className="w-full bg-transparent p-3 rounded-lg focus:bg-white outline-none text-sm cursor-text" value={item.serialNumber} onChange={(e) => { const n = [...batchItems]; n[idx].serialNumber = e.target.value; setBatchItems(n); }} /></td>
                          <td className="p-1"><input className="w-full bg-transparent p-3 rounded-lg focus:bg-white outline-none text-sm cursor-text" value={item.locationStored} onChange={(e) => { const n = [...batchItems]; n[idx].locationStored = e.target.value; setBatchItems(n); }} /></td>
                          <td className="p-1"><input className="w-full bg-transparent p-3 rounded-lg focus:bg-white outline-none text-sm cursor-text" placeholder="Separate with comma..." value={item.inclusions} onChange={(e) => { const n = [...batchItems]; n[idx].inclusions = e.target.value; setBatchItems(n); }} /></td>
                          <td className="p-1">
                            <select className="w-full bg-transparent p-3 rounded-lg focus:bg-white outline-none text-sm font-bold cursor-pointer" value={item.deviceStatus} onChange={(e) => { const n = [...batchItems]; n[idx].deviceStatus = e.target.value; setBatchItems(n); }}>
                              <option value="Working">Working</option>
                              <option value="For Repair">For Repair</option>
                              <option value="Not Working">Not Working</option>
                              <option value="Missing">Missing</option>
                            </select>
                          </td>
                          <td className="p-1">
                            <select className="w-full bg-transparent p-3 rounded-lg focus:bg-white outline-none text-sm font-bold cursor-pointer" value={item.category} onChange={(e) => { const n = [...batchItems]; n[idx].category = e.target.value; setBatchItems(n); }}>
                              <option value="" disabled>Category</option>
                              {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="p-1 text-center">
                            <button type="button" onClick={() => setBatchItems(batchItems.filter((_, i) => i !== idx))} className="p-3 text-[#74777F] hover:text-[#BA1A1A] rounded-full transition-all cursor-pointer">
                               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-300">
              <div className="lg:col-span-7 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Item Code</label>
                    <input name="itemCode" defaultValue={selectedItem?.itemCode ?? ""} className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none font-bold focus:ring-2 focus:ring-[#005FB7] cursor-text text-base" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Old Item Code</label>
                    <input name="oldItemCode" defaultValue={selectedItem?.oldItemCode ?? ""} className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none cursor-text text-base" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Item Name / Description</label>
                    <input name="itemName" defaultValue={selectedItem?.itemName ?? ""} className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none focus:ring-2 focus:ring-[#005FB7] font-semibold cursor-text text-base" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Item Type</label>
                    <input name="itemType" defaultValue={selectedItem?.itemType ?? ""} className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none cursor-text text-base" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Serial Number</label>
                    <input name="serialNumber" defaultValue={selectedItem?.serialNumber ?? ""} className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none font-bold cursor-text text-base" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Storage Location</label>
                    <input name="locationStored" defaultValue={selectedItem?.locationStored ?? ""} className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none cursor-text text-base" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Condition Status</label>
                    <select name="deviceStatus" defaultValue={selectedItem?.deviceStatus ?? "Working"} className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none font-bold cursor-pointer text-base">
                      <option value="Working">Working</option>
                      <option value="For Repair">For Repair</option>
                      <option value="Not Working">Not Working</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Category</label>
                    <select name="category" defaultValue={selectedItem?.category ?? (activeCategory !== "All" ? activeCategory : "")} className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none font-bold cursor-pointer text-base" required>
                      <option value="" disabled>Select Category</option>
                      {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  {/* INCLUSIONS TEXTAREA */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Inclusions</label>
                    <textarea 
                      name="inclusions" 
                      defaultValue={selectedItem?.inclusions ?? ""} 
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length === 1 && val !== '•' && val !== '\n') {
                          e.target.value = '• ' + val;
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const target = e.currentTarget;
                          const start = target.selectionStart;
                          const end = target.selectionEnd;
                          const val = target.value;
                          target.value = val.substring(0, start) + '\n• ' + val.substring(end);
                          target.selectionStart = target.selectionEnd = start + 3;
                        }
                      }}
                      className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none h-32 resize-y cursor-text text-base leading-relaxed" 
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-[#74777F] uppercase px-1">Remarks</label>
                    <textarea name="remarks" defaultValue={selectedItem?.remarks ?? ""} className="w-full bg-[#F1F3F8] p-4 rounded-lg outline-none h-32 resize-y cursor-text text-base" />
                  </div>

                  {/* EDIT MAINTENANCE DATA TABLE */}
                  <div className="space-y-4 md:col-span-2 mt-4 pt-4 border-t border-[#E0E2EC]">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-sm font-bold text-[#74777F] uppercase">Maintenance History</label>
                      <button type="button" onClick={() => setEditMaintenanceLogs([...editMaintenanceLogs, { date: '', activity: '', status: 'Ongoing', center: '' }])} className="text-xs font-bold bg-[#D6E3FF] text-[#005FB7] px-4 py-2 rounded-full uppercase cursor-pointer hover:bg-[#005FB7] hover:text-white transition-colors">+ Add Row</button>
                    </div>
                    <div className="border border-[#E0E2EC] rounded-lg overflow-x-auto bg-[#F7F9FF] shadow-sm">
                      <table className="w-full text-left text-base min-w-[600px]">
                        <thead className="bg-[#F1F3F8] border-b border-[#E0E2EC]">
                          <tr>
                            <th className="p-3 text-xs font-bold text-[#74777F] uppercase w-[20%]">Date</th>
                            <th className="p-3 text-xs font-bold text-[#74777F] uppercase w-[30%]">Activity</th>
                            <th className="p-3 text-xs font-bold text-[#74777F] uppercase w-[20%]">Status</th>
                            <th className="p-3 text-xs font-bold text-[#74777F] uppercase w-[25%]">Center</th>
                            <th className="p-3 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F3F8]">
                          {editMaintenanceLogs.map((log, index) => (
                            <tr key={index} className="hover:bg-white transition-colors">
                              <td className="p-2"><input type="date" value={log.date} onChange={(e) => updateEditLog(index, 'date', e.target.value)} className="w-full p-2 bg-transparent text-sm outline-none cursor-text focus:bg-white rounded-lg" /></td>
                              <td className="p-2"><input type="text" value={log.activity} onChange={(e) => updateEditLog(index, 'activity', e.target.value)} className="w-full p-2 bg-transparent text-sm outline-none cursor-text focus:bg-white rounded-lg" placeholder="Activity..." /></td>
                              <td className="p-2">
                                <select value={log.status} onChange={(e) => updateEditLog(index, 'status', e.target.value)} className="w-full p-2 bg-transparent text-sm font-bold outline-none cursor-pointer focus:bg-white rounded-lg">
                                  <option value="Done">Done</option>
                                  <option value="Ongoing">Ongoing</option>
                                  <option value="For claiming">For claiming</option>
                                </select>
                              </td>
                              <td className="p-2"><input type="text" value={log.center} onChange={(e) => updateEditLog(index, 'center', e.target.value)} className="w-full p-2 bg-transparent text-sm outline-none cursor-text focus:bg-white rounded-lg" placeholder="Center..." /></td>
                              <td className="p-2 text-center">
                                <button type="button" onClick={() => setEditFormLogToDelete(index)} className="text-[#BA1A1A] hover:bg-[#FFDAD6] p-2 rounded-full transition-colors cursor-pointer">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                          {editMaintenanceLogs.length === 0 && (
                            <tr><td colSpan={5} className="p-6 text-center text-sm text-[#74777F] italic">No maintenance records added.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2 pt-4">
                    <label className="text-sm font-bold text-[#005FB7] uppercase px-1">Google Drive Link</label>
                    <input name="gdriveLink" defaultValue={selectedItem?.gdriveLink ?? ""} onChange={(e) => setTempGdriveLink(e.target.value)} className="w-full bg-[#D6E3FF]/30 p-4 rounded-lg outline-none border border-[#D6E3FF] cursor-text text-base" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 lg:border-l lg:border-[#E0E2EC] lg:pl-10 h-full">
                <div className="sticky top-0">
                  <p className="text-sm font-bold text-[#74777F] uppercase mb-4">Documentation Preview</p>
                  {(() => {
                    const link = tempGdriveLink || selectedItem?.gdriveLink;
                    const fileId = link?.match(/\/d\/([a-zA-Z0-9_-]{25,})/)?.[1];
                    return fileId ? (
                      <div className="relative w-full overflow-hidden rounded-lg border border-[#E0E2EC] bg-[#F1F3F8]" style={{ paddingBottom: '125%', height: 0 }}>
                        <iframe src={`https://drive.google.com/file/d/${fileId}/preview`} className="absolute top-0 left-0 w-full h-full border-0"></iframe>
                      </div>
                    ) : (
                      <div className="aspect-[3/4] flex flex-col items-center justify-center text-[#74777F] bg-[#F1F3F8] rounded-lg border-2 border-dashed border-[#E0E2EC] p-10 text-center opacity-60">
                        <p className="text-sm font-bold uppercase">No Valid Link Provided</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="max-w-7xl mx-auto py-4 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isBatchMode ? (
              <div className="border border-[#E0E2EC] rounded-lg bg-white overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse cursor-pointer">
                  <thead className="bg-[#F1F3F8]">
                    <tr>
                      <th className="p-4 text-sm font-bold text-[#74777F] uppercase">Code</th>
                      <th className="p-4 text-sm font-bold text-[#74777F] uppercase">Item Name</th>
                      <th className="p-4 text-sm font-bold text-[#74777F] uppercase">Type</th>
                      <th className="p-4 text-sm font-bold text-[#74777F] uppercase">Status</th>
                      <th className="p-4 text-sm font-bold text-[#74777F] uppercase">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F8]">
                    {Array.isArray(reviewData) && reviewData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#FDFBFF]">
                        <td className="p-4 text-base font-bold text-[#005FB7]">{item.itemCode}</td>
                        <td className="p-4 text-base text-[#1A1C1E]">{item.itemName}</td>
                        <td className="p-4 text-base text-[#74777F]">{item.itemType || "—"}</td>
                        <td className="p-4 text-base font-bold text-[#74777F]">
                          <span className={`px-3 py-1.5 rounded-full text-xs ${item.deviceStatus === 'Working' ? 'bg-green-100 text-green-700' : 'bg-[#fceae6] text-[#980000]'}`}>
                            {item.deviceStatus}
                          </span>
                        </td>
                        <td className="p-4 text-base font-bold text-[#74777F]">{item.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                {reviewData && !Array.isArray(reviewData) && Object.entries(reviewData).map(([key, value]) => {
                  if (key === 'maintenanceLogs') {
                    return (
                      <div key={key} className="border-b border-[#F1F3F8] pb-3 cursor-pointer">
                        <p className="text-sm font-bold text-[#74777F] uppercase mb-1">Maintenance Records</p>
                        <p className="text-base font-bold text-[#1A1C1E] line-clamp-3 whitespace-pre-wrap">{(value as any[]).length} Entry Log(s)</p>
                      </div>
                    );
                  }
                  if (key === 'inclusions') {
                    return (
                      <div key={key} className="border-b border-[#F1F3F8] pb-3 cursor-pointer md:col-span-2">
                        <p className="text-sm font-bold text-[#74777F] uppercase mb-1">Inclusions</p>
                        <p className="text-base font-bold text-[#1A1C1E] whitespace-pre-wrap">{String(value) || "—"}</p>
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="border-b border-[#F1F3F8] pb-3 cursor-pointer">
                      <p className="text-sm font-bold text-[#74777F] uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').replace('_', ' ')}</p>
                      <p className="text-base font-bold text-[#1A1C1E] line-clamp-3 whitespace-pre-wrap">{String(value) || "—"}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 border-t border-[#E0E2EC] bg-white shrink-0">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full">
          {isReviewStep ? (
            <button type="button" onClick={() => setIsReviewStep(false)} className="w-full md:w-auto px-10 py-5 text-[#005FB7] font-bold text-sm uppercase hover:bg-[#F1F3F8] rounded-full transition-colors cursor-pointer">Back to Edit</button>
          ) : (
            <>
              {selectedItem && (
                <button type="button" disabled={isSaving} onClick={() => setShowDeleteConfirm(true)} className="w-full md:w-auto order-2 md:order-1 px-10 py-5 text-[#BA1A1A] font-bold text-sm uppercase hover:bg-[#FFDAD6] rounded-full transition-colors cursor-pointer disabled:opacity-50">Delete Item</button>
              )}
              <button type="button" onClick={() => setIsModalOpen(false)} className="w-full md:w-auto order-3 md:order-2 md:ml-auto px-10 py-5 text-[#44474E] font-bold text-sm uppercase cursor-pointer hover:bg-[#F1F3F8] rounded-full transition-colors">Discard</button>
            </>
          )}
          <button type="submit" disabled={isSaving || (isBatchMode && !isReviewStep && batchItems.length === 0)} className={`w-full md:w-auto order-1 md:order-3 ${isReviewStep ? 'bg-[#2E6C00] hover:bg-[#235300] md:ml-auto' : 'bg-[#005FB7] hover:bg-[#004ba0]'} text-white px-12 py-5 rounded-full font-bold shadow-xl transition-all text-sm uppercase cursor-pointer active:scale-95 flex items-center justify-center gap-2`}>
            {isSaving ? "Processing..." : (isReviewStep ? (isBatchMode ? `Add ${reviewData.length} Items` : "Confirm & Save") : "Review Details")}
          </button>
        </div>
      </div>
    </form>
  </div>
)}

{/* CLEAR BATCH CONFIRMATION MODAL */}
{showClearBatchConfirm && (
  <ConfirmModal 
    title="Clear All Rows?"
    msg="This will remove all items currently entered in the batch table."
    type="danger"
    onConfirm={() => {
      setBatchItems([{ itemCode: "", itemName: "", itemType: "", serialNumber: "", locationStored: "", deviceStatus: "Working", category: activeCategory !== "All" ? activeCategory : "", availabilityStatus: "Available", inclusions: "" }]);
      setShowClearBatchConfirm(false);
    }}
    onCancel={() => setShowClearBatchConfirm(false)}
  />
)}

{/* QR MODAL */}
{isQRModalOpen && (
  <div className="fixed inset-0 bg-[#1A1C1E]/60 flex items-center justify-center p-4 z-[100] backdrop-blur-xs">
    <div className="bg-white p-10 rounded-xl text-center shadow-2xl max-w-sm w-full border border-[#E0E2EC]">
      <h3 className="font-bold text-2xl mb-1 text-[#1A1C1E]">{selectedItem?.itemName}</h3>
      <p className="text-sm text-[#005FB7] mb-8 uppercase font-bold">{selectedItem?.itemCode}</p>
      
      <div className="bg-white p-6 inline-block rounded-lg mb-4 shadow-inner border border-[#F1F3F8] cursor-pointer">
        <QRCodeSVG id="qr-code-svg" value={qrValue} size={220} level="H" />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          {/* Clickable Link Address Bar */}
          <div 
            onClick={() => { 
              navigator.clipboard.writeText(qrValue); 
              setCopied(true); 
              setTimeout(() => setCopied(false), 2000); 
            }} 
            className="flex-1 bg-[#F1F3F8] p-3 rounded-lg border border-[#E0E2EC] flex items-center min-w-0 cursor-pointer hover:bg-[#EAECEF] hover:border-[#C4C6CF] transition-colors group"
            title="Click to copy link"
          >
            <input 
              readOnly 
              value={qrValue} 
              className="bg-transparent text-sm text-[#44474E] w-full truncate font-bold outline-none cursor-pointer group-hover:text-[#1A1C1E]" 
            />
          </div>

          {/* Icon-Only Copy/Check Button */}
          <button 
            onClick={() => { 
              navigator.clipboard.writeText(qrValue); 
              setCopied(true); 
              setTimeout(() => setCopied(false), 2000); 
            }} 
            className="bg-[#E0E2EC] text-[#005FB7] p-3 rounded-lg transition-colors shrink-0 flex items-center justify-center hover:bg-[#D6E3FF] cursor-pointer"
            aria-label={copied ? "Copied" : "Copy Link"}
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            )}
          </button>
        </div>

        <button onClick={downloadQRCode} className="w-full bg-[#005FB7] text-white py-5 rounded-full font-bold text-base uppercase cursor-pointer shadow-lg hover:bg-[#004ba0] transition-all">Download QR Code</button>
        <button onClick={() => setIsQRModalOpen(false)} className="w-full text-[#44474E] py-3 text-sm font-bold uppercase cursor-pointer hover:opacity-70">Close</button>
      </div>
    </div>
  </div>
)}

{mobileMenuOpen && (
  <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-[#1A1C1E]/60 z-40 lg:hidden backdrop-blur-sm cursor-pointer" />
)}
</div>
);
}

// --- SUB-COMPONENTS ---
function ConfirmModal({ title, msg, onConfirm, onCancel, type, isSaving }: any) {
  return (  
    <div className="fixed inset-0 bg-[#1A1C1E]/80 flex items-center justify-center p-4 z-[110] backdrop-blur-md">
      <div className={`bg-white p-10 rounded-xl max-w-md w-full shadow-2xl border border-[#E0E2EC] transition-all ${isSaving ? 'opacity-80 scale-95' : 'scale-100'}`}>
        <h3 className={`text-3xl font-bold mb-4 ${type === 'danger' ? 'text-[#BA1A1A]' : 'text-[#005FB7]'}`}>{title}</h3>
        <p className="text-[#44474E] text-base leading-relaxed mb-10 font-medium">{msg}</p>
        <div className="flex gap-4">
          <button onClick={onCancel} disabled={isSaving} className="flex-1 py-5 text-[#44474E] font-bold text-sm uppercase cursor-pointer hover:bg-[#F1F3F8] rounded-full transition-colors disabled:opacity-30">Cancel</button>
          <button onClick={onConfirm} disabled={isSaving} className={`flex-1 py-5 rounded-full text-white font-bold text-sm uppercase shadow-lg transition-all flex items-center justify-center cursor-pointer gap-2 ${isSaving ? 'bg-[#74777F]' : type === 'danger' ? 'bg-[#BA1A1A] hover:bg-[#93000A]' : 'bg-[#005FB7] hover:bg-[#004ba0]'}`}>
            {isSaving ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}