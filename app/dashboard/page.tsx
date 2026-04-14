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

const EditableCell = ({ value, field, itemId, onUpdate, children, type = "text", options = [], editTrigger = "doubleClick" }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || "");

  useEffect(() => {
    setCurrentValue(value || "");
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== value) {
      onUpdate(itemId, field, currentValue);
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
            if (e.target.value !== value) onUpdate(itemId, field, e.target.value);
          }}
          onBlur={handleBlur}
          className="w-full bg-white border-2 border-[#005FB7] rounded px-1 py-1 text-xs font-bold outline-none shadow-sm text-black uppercase cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        autoFocus
        type="text"
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

export default function UnifiedDashboard() {
  // --- STATES ---
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Cameras & Accessories");
  
  const [activeViewTab, setActiveViewTab] = useState("description");
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
const [sortOrder, setSortOrder] = useState("itemCode");
const [sortConfig, setSortConfig] = useState({ key: 'itemCode', direction: 'asc' });
  
const [copied, setCopied] = useState(false); // <--- PASTE THIS LINE HERE

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
// Add these lines inside your UnifiedDashboard component
const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
const [showClearBatchConfirm, setShowClearBatchConfirm] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qrValue, setQrValue] = useState("");

  const router = useRouter();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const categories = [
    "All", "Cameras & Accessories", "Lights & Accessories", "Sound & Accessories",
    "Computers & Peripherals", "Office Appliance", "Others"
  ];

  const requestSort = (key: string) => {
  let direction: 'asc' | 'desc' = 'asc';
  if (sortConfig.key === key && sortConfig.direction === 'asc') {
    direction = 'desc';
  }
  setSortConfig({ key, direction });
  setSortOrder("custom");
};

// --- LOGIC: FILTERED & SORTED ITEMS ---
// 2. Update the sort logic inside filteredItems
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
    // Handle the legacy dropdown sortOrder if it's "oldest" or "newest"
    if (sortOrder === "oldest" || sortOrder === "newest") {
      const dateA = new Date(a.created_at || a.id).getTime();
      const dateB = new Date(b.created_at || b.id).getTime();
      return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
    }

    // Handle Clickable Header Logic
    const aValue = (a[sortConfig.key] || "").toString().toLowerCase();
    const bValue = (b[sortConfig.key] || "").toString().toLowerCase();

    // Use numeric comparison for item codes to keep "Item 2" before "Item 10"
    if (sortConfig.key === 'itemCode' || sortConfig.key === 'oldItemCode') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue, undefined, { numeric: true })
        : bValue.localeCompare(aValue, undefined, { numeric: true });
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });  



// --- PRINT LOGIC (Sorted by Item Code) ---
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
      // Filter items by category and apply Natural Sort on Item Codes
      const categoryItems = itemsList
        .filter(item => item.category === cat)
        .sort((a, b) => {
          return (a.itemCode || "").localeCompare(b.itemCode || "", undefined, {
            numeric: true,
            sensitivity: 'base'
          });
        });
        
      const rowsNeeded = Math.max(categoryItems.length, 12); 
      const isFirstPage = index === 0;
      const isLastPage = index === printCategories.length - 1;

      const tableRows = Array.from({ length: rowsNeeded }).map((_, i) => {
        const item = categoryItems[i] || {};
        return `
          <tr>
            <td style="width: 10%">${item.itemCode || ""}</td>
            <td style="width: 30%; font-weight: bold;">${item.itemName || ""}</td>
            <td style="width: 12%">${item.itemType || ""}</td>
            <td style="width: 15%">${item.serialNumber || ""}</td>
            <td style="width: 13%">${item.locationStored || ""}</td>
            <td style="width: 10%">${item.deviceStatus || ""}</td>
            <td style="width: 10%">${item.availabilityStatus || ""}</td>
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
                <th>AVAILABILITY</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          ${isLastPage ? `
          <table class="sig-table">
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
          ` : ''}
        </div>
      `;
    }).join('');

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
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- EFFECT: MODAL SCROLL LOCK ---
  useEffect(() => {
    const isAnyModalOpen = isModalOpen || isQRModalOpen || isViewModalOpen || showLogoutConfirm || showDeleteConfirm || showSaveConfirm;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen, isQRModalOpen, isViewModalOpen, showLogoutConfirm, showDeleteConfirm, showSaveConfirm]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const [itemsRes, logsRes] = await Promise.all([
          getAllItems(),
          getAllLogs()
        ]);
        if (itemsRes.success) setItemsList(itemsRes.data || []);
        if (logsRes.success) setLogs(logsRes.data || []);
        setLoading(false);
      } catch (error) {
        console.error("Initialization error:", error);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

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
      const data = Object.fromEntries(formData.entries());
      setReviewData(data); 
      setIsReviewStep(true);
    } else {
      setShowSaveConfirm(true);
    }
  };
const confirmSave = async () => {
  if (!reviewData) return;
  setIsSaving(true);

  try {
    // --- STEP 1: VALIDATION BEFORE SAVING ---
    if (Array.isArray(reviewData)) {
      const itemCodesInBatch = reviewData.map(i => i.itemCode.trim());
      
      // 1. Check for duplicates within the batch itself
      const hasDuplicatesInBatch = itemCodesInBatch.some((code, index) => itemCodesInBatch.indexOf(code) !== index);
      if (hasDuplicatesInBatch) {
        alert("Error: Duplicate Item Codes detected within your batch entry. Please fix them first.");
        setIsSaving(false);
        return;
      }

      // 2. Check for duplicates against existing records in itemsList
      const existingCodes = itemsList.map(i => i.itemCode);
      const hasExistingCode = itemCodesInBatch.some(code => existingCodes.includes(code));
      if (hasExistingCode) {
        alert("Error: One or more Item Codes already exist in the records. Batch entry aborted.");
        setIsSaving(false);
        return;
      }
      
      // 3. Check for empty fields (Required: Code and Name)
      const hasEmptyFields = reviewData.some(i => !i.itemCode.trim() || !i.itemName.trim());
      if (hasEmptyFields) {
        alert("Error: All items in the batch must have an Item Code and Item Name.");
        setIsSaving(false);
        return;
      }
    }

    // --- STEP 2: ACTUAL SAVING ---
    let success = true;

    if (Array.isArray(reviewData)) {
      // NOTE: For true "All or Nothing", your backend/action should ideally handle a batch array.
      // If addItem is single-entry only, we use Promise.all to ensure we catch if ANY fails.
      
      const savePromises = reviewData.map(item => addItem(item));
      const results = await Promise.all(savePromises);
      
      if (results.some(res => !res.success)) {
        success = false;
      }
    } else {
      // Single Item Logic
      const res = selectedItem 
        ? await updateItem(selectedItem.id, reviewData) 
        : await addItem(reviewData);
      
      if (!res.success) success = false;
    }

    if (success) {
      setShowSaveConfirm(false);
      setIsModalOpen(false);
      setIsReviewStep(false); 
      setReviewData(null);
      setIsBatchMode(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      
      const updated = await getAllItems();
      if (updated.success) setItemsList(updated.data || []);
    } else {
      alert("Failed to save some records. The operation might be partially completed. Please check your data.");
    }
  } catch (error) {
    console.error("Save error:", error);
    alert("An unexpected error occurred.");
  } finally {
    setIsSaving(false);
  }
};

  const handleInlineUpdate = async (itemId: number, field: string, newValue: any) => {
    if (newValue === undefined) return;
    const itemToUpdate = itemsList.find(item => item.id === itemId);
    if (!itemToUpdate) return;

    setIsSaving(true);
    let updatedFields: any = { [field]: newValue };
    if (field === "deviceStatus") {
      updatedFields.availabilityStatus = newValue === "Working" ? "Available" : "Unavailable";
    }

    setItemsList(prevItems => prevItems.map(item => 
      item.id === itemId ? { ...item, ...updatedFields } : item
    ));

    try {
      const res = await updateItem(itemId, { ...itemToUpdate, ...updatedFields, gdrive_link: itemToUpdate.gdriveLink });
      if (res.success) {
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
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
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
      const res = await deleteItem(selectedItem.id);
      if (res.success) window.location.reload();
    }
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
            {/* Show title if NOT minimized OR if on mobile */}
            {(!sidebarMinimized || mobileMenuOpen) && (
              <h2 className="font-bold text-[#005FB7] tracking-tight whitespace-nowrap lg:block hidden">Inventory Dashboard</h2>
            )}
            {/* Mobile-only title (always shows when menu is open) */}
            <h2 className="font-bold text-[#005FB7] tracking-tight whitespace-nowrap lg:hidden">COMMAND CENTER</h2>
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
                
                {/* Standard Label: Hidden on desktop when minimized, always shown on mobile */}
                <span className={`font-semibold text-sm whitespace-nowrap ${sidebarMinimized ? "lg:hidden block" : "block"}`}>
                  {item.label}
                </span>
                
                {/* Hover Tooltip: Only renders and shows on desktop (lg) when minimized */}
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
              
              <span className={`text-sm ${sidebarMinimized ? "lg:hidden block" : "block"}`}>Sign Out</span>
              
              {/* Logout Tooltip: Desktop only */}
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
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-[#1A1C1E] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md">
        <div className="bg-[#C4EED0] p-1 rounded-full">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#002107" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <span className="text-[11px] font-bold tracking-widest whitespace-nowrap">Dashboard Changes Saved</span>
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
          placeholder="Search inventory..." 
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
            onChange={(e) => setActiveCategory(e.target.value)}
            className="appearance-none bg-transparent pr-10 py-1 text-lg md:text-xl font-bold text-[#1A1C1E] outline-none cursor-pointer hover:text-[#005FB7] transition-all border-none focus:ring-0"
          >
            {categories.filter(cat => cat !== "All").map((cat) => (
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
        {/* SORT DROPDOWN - Sets state to Custom when header is clicked, but still functional */}
        <div className="flex items-center gap-2 bg-[#F1F3F8] px-4 py-2 rounded-xl border border-transparent hover:border-[#E0E2EC] transition-all hidden lg:flex">
          <span className="text-[10px] font-black text-[#74777F] uppercase tracking-tighter">Sort:</span>
          <select 
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              // If user selects oldest/newest, we can reset the header sort config if desired
            }}
            className="bg-transparent text-[11px] font-bold text-[#005FB7] outline-none cursor-pointer uppercase tracking-tight"
          >
            <option value="itemCode">Item Code (A-Z)</option>
            <option value="oldest">Oldest First</option>
            <option value="newest">Newest First</option>
            {sortOrder === "custom" && <option value="custom">Custom Column</option>}
          </select>
        </div>

        <button 
          onClick={handlePrintAll} 
          className="flex-1 sm:flex-none bg-white border border-[#E0E2EC] text-[#44474E] px-4 sm:px-5 py-3.5 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-wider shadow-sm hover:bg-[#F1F3F8] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
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
          className="flex-1 sm:flex-none bg-[#005FB7] text-white px-4 sm:px-8 py-3.5 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-wider shadow-lg hover:bg-[#004ba0] transition-all cursor-pointer flex items-center justify-center whitespace-nowrap active:scale-95"
        >
          + Add Item
        </button>
      </div>
    </div>

    {/* DATA CONTAINER */}
    <div className="bg-white rounded-[32px] md:rounded-[40px] border border-[#E0E2EC] overflow-hidden shadow-sm">
      
     {/* SORTABLE DESKTOP HEADER */}
<div className="hidden lg:grid grid-cols-[0.8fr_2.5fr_1fr_1.2fr_1fr_1.2fr_1.2fr_1fr_1.5fr] gap-3 bg-[#F7F9FF] px-8 py-5 text-xs font-bold text-[#74777F] uppercase tracking-normal border-b border-[#E0E2EC]">
  
  {[
    { label: "Item Code", key: "itemCode" },
    { label: "Item Name", key: "itemName" },
    { label: "Item Type", key: "itemType" },
    { label: "Serial No.", key: "serialNumber" },
    { label: "Location", key: "locationStored" },
    { label: "Status", key: "deviceStatus" },
    { label: "Availability", key: "availabilityStatus", center: true },
    { label: "Old Code", key: "oldItemCode" }
  ].map((header) => {
    const isActive = sortConfig.key === header.key;
    return (
      <div 
        key={header.key}
        onClick={() => requestSort(header.key)}
        className={`flex items-center gap-1.5 cursor-pointer hover:text-[#005FB7] transition-colors group/h ${header.center ? "justify-center" : ""}`}
      >
        <span className="select-none">{header.label}</span>
        
        {/* Arrow Stack */}
        <div className="flex flex-col -space-y-0.5">
          {/* UP ARROW (ASC) */}
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
          
          {/* DOWN ARROW (DESC) */}
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
          <div key={item.id} className="hover:bg-[#F8FAFF] transition-colors group">
            {/* DESKTOP ROW VIEW */}
            <div className="hidden lg:grid grid-cols-[0.8fr_2.5fr_1fr_1.2fr_1fr_1.2fr_1.2fr_1fr_1.5fr] gap-3 items-center px-8 py-6">
              
              {/* 1. Item Code */}
              <div id={`cell-${rowIndex}-0`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 0)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.itemCode} field="itemCode" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <div className="font-bold text-xs text-[#005FB7] bg-[#D6E3FF] px-2 py-1 rounded w-fit select-none">{item.itemCode}</div>
                </EditableCell>
              </div>

              {/* 2. Item Name */}
              <div id={`cell-${rowIndex}-1`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 1)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.itemName} field="itemName" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <p className="font-bold text-sm text-[#1A1C1E] whitespace-normal break-words leading-tight select-none">{item.itemName}</p>
                </EditableCell>
              </div>

              {/* 3. Item Type */}
              <div id={`cell-${rowIndex}-3`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 3)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.itemType} field="itemType" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <div className="text-sm text-[#44474E] select-none">{item.itemType || "—"}</div>
                </EditableCell>
              </div>

              {/* 4. Serial No. */}
              <div id={`cell-${rowIndex}-4`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 4)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.serialNumber} field="serialNumber" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <div className="font-bold text-xs text-[#44474E] break-all whitespace-normal select-none">{item.serialNumber || "N/A"}</div>
                </EditableCell>
              </div>

              {/* 5. Location */}
              <div id={`cell-${rowIndex}-5`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 5)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.locationStored} field="locationStored" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <div className="text-sm text-[#44474E] select-none">{item.locationStored || "—"}</div>
                </EditableCell>
              </div>

              {/* 6. Device Status */}
              <div id={`cell-${rowIndex}-6`} tabIndex={0} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <select 
                  value={item.deviceStatus || "Working"}
                  onChange={(e) => handleInlineUpdate(item.id, "deviceStatus", e.target.value)}
                  className={`text-xs font-bold uppercase outline-none cursor-pointer bg-transparent hover:bg-white hover:ring-1 hover:ring-[#E0E2EC] p-1 rounded transition-all w-full ${item.deviceStatus === 'Working' ? 'text-green-600' : 'text-orange-600'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {["Working", "For Repair", "Not Working", "Missing"].map(opt => (
                    <option key={opt} value={opt} className="text-[#1A1C1E]">{opt}</option>
                  ))}
                </select>
              </div>

              {/* 7. Availability */}
              <div className="text-center w-full block">
                <span className={`text-xs font-bold px-4 py-1.5 rounded-full uppercase ${
                  item.availabilityStatus === 'Available' ? 'bg-[#C4EED0] text-[#002107]' : 'bg-[#E2E2E6] text-[#1A1C1E]'
                }`}>
                  {item.availabilityStatus}
                </span>
              </div>

              {/* 8. Old Item Code */}
              <div id={`cell-${rowIndex}-7`} tabIndex={0} onKeyDown={(e) => handleCellKeyDown(e, rowIndex, 7)} className="outline-none focus:ring-2 focus:ring-[#005FB7] focus:ring-inset rounded-lg transition-all cursor-pointer p-1 w-full block">
                <EditableCell value={item.oldItemCode} field="oldItemCode" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                  <div className="font-mono text-xs text-[#74777F] select-none">{item.oldItemCode || "—"}</div>
                </EditableCell>
              </div>
              
              <div className="flex items-center justify-end gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => {setSelectedItem(item); setIsViewModalOpen(true);}} className="text-xs font-bold uppercase text-[#005FB7] hover:underline cursor-pointer mr-1">View Record</button>
                <div className="w-[1px] h-3 bg-[#E0E2EC] mx-1"></div>
                <button onClick={() => { const url = `${window.location.origin}/?c=${item.itemCode}`; setQrValue(url); setSelectedItem(item); setIsQRModalOpen(true); }} className="p-1.5 text-[#005FB7] hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-[#E0E2EC]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/></svg>
                </button>
                <button onClick={() => {setSelectedItem(item); setIsModalOpen(true);}} className="p-1.5 text-[#005FB7] hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-[#E0E2EC]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="lg:hidden p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1 w-full">
                  <EditableCell value={item.itemCode} field="itemCode" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <span className="font-mono text-xs font-bold text-[#005FB7] bg-[#D6E3FF] px-2 py-0.5 rounded uppercase cursor-pointer w-fit block">{item.itemCode}</span>
                  </EditableCell>
                  <EditableCell value={item.itemName} field="itemName" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <h3 className="font-bold text-[#1A1C1E] text-base leading-normal whitespace-normal break-words cursor-pointer block w-full">{item.itemName}</h3>
                  </EditableCell>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase shrink-0 ${item.availabilityStatus === 'Available' ? 'bg-[#C4EED0] text-[#002107]' : 'bg-[#E2E2E6] text-[#1A1C1E]'}`}>{item.availabilityStatus}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#F1F3F8]">
                <div className="w-full">
                  <p className="text-xs font-bold text-[#74777F] uppercase mb-1">Type / Serial</p>
                  <EditableCell value={item.itemType} field="itemType" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <p className="text-sm font-bold text-[#44474E] cursor-pointer block w-full">{item.itemType || "—"}</p>
                  </EditableCell>
                  <EditableCell value={item.serialNumber} field="serialNumber" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <p className="text-xs font-bold text-[#74777F] cursor-pointer break-all block w-full mt-1">{item.serialNumber || "No Serial"}</p>
                  </EditableCell>
                </div>
                <div className="w-full">
                  <p className="text-xs font-bold text-[#74777F] uppercase mb-1">Status</p>
                  <select value={item.deviceStatus || "Working"} onChange={(e) => handleInlineUpdate(item.id, "deviceStatus", e.target.value)} className={`text-sm font-bold uppercase outline-none cursor-pointer bg-transparent w-full ${item.deviceStatus === 'Working' ? 'text-green-600' : 'text-orange-600'}`}>
                    {["Working", "For Repair", "Not Working", "Missing"].map(opt => (
                      <option key={opt} value={opt} className="text-[#1A1C1E]">{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full">
                  <p className="text-xs font-bold text-[#74777F] uppercase mb-1">Location</p>
                  <EditableCell value={item.locationStored} field="locationStored" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <p className="text-sm font-bold text-[#44474E] cursor-pointer block w-full">{item.locationStored || "—"}</p>
                  </EditableCell>
                </div>
                <div className="w-full">
                  <p className="text-xs font-bold text-[#74777F] uppercase mb-1">Old Code</p>
                  <EditableCell value={item.oldItemCode} field="oldItemCode" itemId={item.id} onUpdate={handleInlineUpdate} editTrigger="doubleClick">
                    <p className="text-sm font-bold text-[#44474E] cursor-pointer block w-full">{item.oldItemCode || "—"}</p>
                  </EditableCell>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => {setSelectedItem(item); setIsViewModalOpen(true);}} className="w-full bg-[#F1F3F8] py-3 rounded-xl text-xs font-bold uppercase text-[#005FB7] cursor-pointer">View Remarks & Logs</button>
                <div className="flex gap-2">
                  <button onClick={() => { const url = `${window.location.origin}/?c=${item.itemCode}`; setQrValue(url); setSelectedItem(item); setIsQRModalOpen(true); }} className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#E0E2EC] py-3 rounded-xl text-xs font-bold uppercase text-[#005FB7] cursor-pointer shadow-sm active:bg-[#F7F9FF]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/></svg>
                    View QR Code
                  </button>
                  <button onClick={() => {setSelectedItem(item); setIsModalOpen(true);}} className="flex-1 bg-[#005FB7] text-white py-3 rounded-xl text-xs font-bold uppercase cursor-pointer shadow-md">Edit</button>
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
{/* VIEW PREVIEW MODAL (Item Specification) */}
{isViewModalOpen && selectedItem && (
  <div 
    className="fixed inset-0 bg-[#1A1C1E]/60 flex items-center justify-center z-[100] md:p-4 backdrop-blur-md"
    onClick={() => {
      setIsViewModalOpen(false);
      setActiveViewTab('description'); // Reset to default on close
    }} 
  >
    <div 
      className="bg-[#FDFBFF] flex flex-col h-full w-full md:h-[85vh] md:max-w-4xl lg:max-w-6xl md:rounded-[40px] shadow-2xl border border-[#E0E2EC] transition-all overflow-hidden font-sans"
      onClick={(e) => e.stopPropagation()} 
    >
      {/* HEADER */}
      <div className="flex justify-between items-center p-6 md:p-8 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-[#005FB7] rounded-full"></div>
          <h2 className="font-bold text-[#005FB7] text-lg tracking-tight">Item Specification</h2>
        </div>
        <button 
          onClick={() => {
            setIsViewModalOpen(false);
            setActiveViewTab('description');
          }} 
          className="p-3 bg-[#F1F3F8] md:bg-transparent md:p-2 rounded-full transition-colors cursor-pointer text-[#44474E] active:scale-90"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex gap-6 md:gap-10 px-6 md:px-10 border-b border-[#E0E2EC] bg-white overflow-x-auto no-scrollbar shrink-0">
        {[
          { id: 'description', label: 'Item Description' },
          { id: 'usage', label: 'Usage Records' },
          { id: 'maintenance', label: 'Maintenance History' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveViewTab(tab.id)}
            className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap cursor-pointer ${
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

      {/* SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-white">
        
        {/* TAB 1: ITEM DESCRIPTION (With Integrated Preview) */}
        {activeViewTab === 'description' && (
          <div className="animate-in fade-in duration-300 grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: Details */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.1em]">Item Name</p>
                  <p className="text-xl font-black text-[#1A1C1E] leading-tight">{selectedItem.itemName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.1em]">Item Code</p>
                  <p className="text-base font-bold text-[#005FB7]">{selectedItem.itemCode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.1em]">Category</p>
                  <p className="text-base font-bold text-[#1A1C1E]">{selectedItem.category}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.1em]">Serial Number</p>
                  <p className="text-base font-bold text-[#1A1C1E]">{selectedItem.serialNumber || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.1em]">Condition</p>
                  <p className={`text-sm font-black uppercase ${selectedItem.deviceStatus === 'Working' ? 'text-green-600' : 'text-orange-600'}`}>{selectedItem.deviceStatus}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.1em]">Availability</p>
                  <p className={`text-sm font-black uppercase ${selectedItem.availabilityStatus === 'Available' ? 'text-[#005FB7]' : 'text-[#74777F]'}`}>{selectedItem.availabilityStatus}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.1em]">Storage Location</p>
                  <p className="text-base font-bold text-[#1A1C1E]">{selectedItem.locationStored || "—"}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-[#F1F3F8]">
                <h4 className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.15em] mb-3">Remarks</h4>
                <p className="text-sm text-[#44474E] leading-loose max-w-full whitespace-pre-wrap break-words">
                  {selectedItem.remarks ? (
                    <span className="italic">{selectedItem.remarks}</span>
                  ) : (
                    <span className="text-[#8E9199] italic">No additional remarks recorded for this item.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Right Column: Google Docs Preview */}
            <div className="lg:border-l lg:pl-10 border-[#E0E2EC]">
              <p className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.1em] mb-4">Document Preview</p>
              {(() => {
                const rawLink = selectedItem?.gdriveLink;
                const fileIdMatch = rawLink?.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
                const fileId = fileIdMatch ? fileIdMatch[1] : null;

                if (fileId) {
                  return (
                    <div className="w-full space-y-4">
                      <div className="relative w-full aspect-[1/1.3] overflow-hidden rounded-2xl border border-[#E0E2EC] bg-[#F1F3F8] shadow-sm">
                        <iframe 
                          src={`https://drive.google.com/file/d/${fileId}/preview`} 
                          className="absolute top-0 left-0 w-full h-full border-0" 
                          allow="autoplay"
                        ></iframe>
                      </div>
                      <a href={rawLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#F1F3F8] text-[#005FB7] px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#D6E3FF] transition-all cursor-pointer justify-center">
                        Open in New Tab
                      </a>
                    </div>
                  );
                }
                return (
                  <div className="w-full aspect-[1/1.3] flex flex-col items-center justify-center text-[#74777F] bg-[#F7F9FF] rounded-3xl border-2 border-dashed border-[#E0E2EC] p-10">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 opacity-20"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-center">No document attached</p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: USAGE RECORDS */}
        {activeViewTab === 'usage' && (
          <div className="animate-in fade-in duration-300">
            <div className="border border-[#E0E2EC] rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FF] text-[#74777F] font-bold uppercase text-[9px]">
                  <tr>
                    <th className="px-6 py-4">Purpose Title</th>
                    <th className="px-6 py-4 text-center">Date Requested</th>
                    <th className="px-6 py-4 text-center">Date Returned</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F8]">
                  {(() => {
                    const logsArray = Array.isArray(logs) ? logs : (logs as any)?.data || [];
                    const itemLogs = logsArray.filter((log: any) => log.itemId === selectedItem.id);
                    if (itemLogs.length === 0) return <tr><td colSpan={4} className="px-6 py-12 text-center text-[#74777F] italic">No records found.</td></tr>;
                    return itemLogs.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F7F9FF] transition-colors">
                        <td className="px-6 py-4 font-bold text-[#1A1C1E]">{log.purposeTitle}</td>
                        <td className="px-6 py-4 text-center text-[#44474E]">{log.dateRequested?.split('T')[0] || "—"}</td>
                        <td className="px-6 py-4 text-center text-[#44474E]">
                          {log.displayReturnDate || log.dateReturned?.split('T')[0] || "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full font-bold text-[9px] uppercase tracking-tighter ${log.dateReturned ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
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

        {/* TAB 3: MAINTENANCE HISTORY */}
        {activeViewTab === 'maintenance' && (
          <div className="animate-in fade-in duration-300 space-y-4">
            <p className="text-[10px] font-bold text-[#74777F] uppercase tracking-[0.1em]">Historical Log</p>
            <div className="bg-[#F7F9FF] border border-[#E0E2EC] p-8 rounded-3xl min-h-[200px]">
              <p className="text-sm text-[#44474E] leading-relaxed whitespace-pre-wrap">
                {selectedItem.maintenanceRecords || "No maintenance history has been logged."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-6 md:p-8 border-t border-[#F1F3F8] bg-white shrink-0 flex flex-col md:flex-row gap-3">
        <button 
          onClick={() => { setIsModalOpen(true); }} 
          className="flex-1 bg-[#F1F3F8] text-[#1A1C1E] py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-[#E0E2EC] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit Item
        </button>
        <button 
          onClick={() => { 
            const url = `${window.location.origin}/?c=${selectedItem.itemCode}`;
            setQrValue(url); setSelectedItem(selectedItem); setIsQRModalOpen(true); 
          }}
          className="flex-1 bg-[#F1F3F8] text-[#005FB7] py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-[#D6E3FF] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          View QR
        </button>
        <button 
          onClick={() => {
            setIsViewModalOpen(false);
            setActiveViewTab('description');
          }} 
          className="md:flex-none md:px-12 bg-[#1A1C1E] text-white py-4 rounded-full font-black text-[10px] uppercase tracking-widest cursor-pointer active:bg-black transition-all"
        >
          Close
        </button>
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
              alert("Please enter at least one valid item (Code and Name required)");
            }
          } else {
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            setReviewData(data);
            setIsReviewStep(true);
          }
        } else {
          initiateSave(e);
        }
      }} 
      className="bg-[#FDFBFF] w-full h-[90vh] md:max-w-6xl lg:max-w-7xl md:rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
    >
      {/* HEADER */}
      <div className="p-6 md:p-8 border-b border-[#E0E2EC] flex justify-between items-center bg-white shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#1A1C1E]">
              {isReviewStep ? (isBatchMode ? "Review Batch Items" : "Review Details") : (isBatchMode ? "Batch Table Entry" : (selectedItem ? "Update Item" : "Add Item"))}
            </h2>
            {!selectedItem && !isReviewStep && (
              <button 
                type="button"
                onClick={() => {
                   setIsBatchMode(!isBatchMode);
                   if (!isBatchMode) setBatchItems([{ itemCode: "", itemName: "", itemType: "", serialNumber: "", locationStored: "", deviceStatus: "Working", category: "", availabilityStatus: "Available" }]);
                }}
                className="text-[10px] font-black px-3 py-1 bg-[#D6E3FF] text-[#005FB7] rounded-full uppercase tracking-widest hover:bg-[#005FB7] hover:text-white transition-all cursor-pointer"
              >
                {isBatchMode ? "Switch to Single Form" : "Switch to Batch Table"}
              </button>
            )}
          </div>
          {isReviewStep && <p className="text-xs text-[#74777F] font-bold uppercase tracking-wider mt-1">Please verify information</p>}
        </div>
        <button 
          type="button" 
          disabled={isSaving}
          onClick={() => {
            const form = document.getElementById('inventory-form') as HTMLFormElement;
            if (!form) return;
            const formData = new FormData(form);
            const currentData = Object.fromEntries(formData.entries());

            const hasSingleChanges = !isBatchMode && Object.keys(currentData).some(key => {
                const initialValue = selectedItem ? (selectedItem[key as keyof typeof selectedItem] || "") : "";
                const currentValue = currentData[key] || "";
                if (key === 'gdrive_link') {
                  return String(currentValue).trim() !== String(selectedItem?.gdriveLink || "").trim();
                }
                return String(currentValue).trim() !== String(initialValue).trim();
            });

            const hasBatchChanges = isBatchMode && (
                batchItems.length > 1 || 
                (batchItems[0].itemCode.trim() !== "" || batchItems[0].itemName.trim() !== "")
            );

            if (hasSingleChanges || hasBatchChanges) {
                setShowDiscardConfirm(true);
            } else {
                setIsModalOpen(false);
                setIsReviewStep(false);
                setReviewData(null);
                setIsBatchMode(false);
                setTempGdriveLink("");
            }
          }} 
          className="p-3 hover:bg-[#F1F3F8] rounded-full transition-colors cursor-pointer disabled:opacity-30"
        >
          ✕
        </button>
      </div>
      
      {/* CONTENT AREA */}
      <div className={`flex-1 p-6 md:p-10 overflow-y-auto bg-white/50 transition-all duration-300 ${isSaving ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {!isReviewStep ? (
          isBatchMode ? (
            /* BATCH TABLE TYPE FORM */
            <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
              <div className="flex justify-between items-center px-1 shrink-0">
                <div>
                  <p className="text-[10px] font-black text-[#005FB7] uppercase tracking-widest">Bulk Inventory Input</p>
                  <p className="text-xs text-[#74777F]">Fill out the grid below. Tab through cells to move quickly.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowClearBatchConfirm(true)} 
                    className="text-[10px] font-bold text-[#BA1A1A] uppercase px-3 py-2 hover:bg-[#FFDAD6] rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                  <button type="button" onClick={() => setBatchItems([...batchItems, { itemCode: "", itemName: "", itemType: "", serialNumber: "", locationStored: "", deviceStatus: "Working", category: "", availabilityStatus: "Available" }])} className="bg-[#005FB7] text-white text-[10px] font-bold uppercase px-4 py-2 rounded-lg shadow-md hover:bg-[#004ba0] transition-colors">+ Add Row</button>
                </div>
              </div>

              <div className="border border-[#E0E2EC] rounded-[24px] overflow-hidden bg-white shadow-sm flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                  <table className="w-full border-collapse table-fixed min-w-[1000px]">
                    <thead className="bg-[#F1F3F8] border-b border-[#E0E2EC] sticky top-0 z-10">
                      <tr>
                        <th className="p-4 text-[10px] font-black text-[#74777F] uppercase w-[12%] text-left">Code</th>
                        <th className="p-4 text-[10px] font-black text-[#74777F] uppercase w-[20%] text-left">Item Name</th>
                        <th className="p-4 text-[10px] font-black text-[#74777F] uppercase w-[12%] text-left">Type</th>
                        <th className="p-4 text-[10px] font-black text-[#74777F] uppercase w-[15%] text-left">Serial No.</th>
                        <th className="p-4 text-[10px] font-black text-[#74777F] uppercase w-[15%] text-left">Location</th>
                        <th className="p-4 text-[10px] font-black text-[#74777F] uppercase w-[12%] text-left">Status</th>
                        <th className="p-4 text-[10px] font-black text-[#74777F] uppercase w-[10%] text-left">Category</th>
                        <th className="p-4 text-[10px] font-black text-[#74777F] uppercase w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F3F8]">
                      {batchItems.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-[#F7F9FF] transition-colors">
                          <td className="p-1">
                            <input 
                              placeholder="CO-XXX-XX"
                              className="w-full bg-transparent p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#005FB7] outline-none font-bold text-sm" 
                              value={item.itemCode} 
                              onChange={(e) => { const newBatch = [...batchItems]; newBatch[idx].itemCode = e.target.value; setBatchItems(newBatch); }} 
                            />
                          </td>
                          <td className="p-1">
                            <input 
                              placeholder="Item Name or Description"
                              className="w-full bg-transparent p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#005FB7] outline-none text-sm" 
                              value={item.itemName} 
                              onChange={(e) => { const newBatch = [...batchItems]; newBatch[idx].itemName = e.target.value; setBatchItems(newBatch); }} 
                            />
                          </td>
                          <td className="p-1">
                            <input 
                              placeholder="Item Type"
                              className="w-full bg-transparent p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#005FB7] outline-none text-sm" 
                              value={item.itemType} 
                              onChange={(e) => { const newBatch = [...batchItems]; newBatch[idx].itemType = e.target.value; setBatchItems(newBatch); }} 
                            />
                          </td>
                          <td className="p-1">
                            <input 
                              placeholder="SN-XXXX-XXXX"
                              className="w-full bg-transparent p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#005FB7] outline-none font-mono text-xs" 
                              value={item.serialNumber} 
                              onChange={(e) => { const newBatch = [...batchItems]; newBatch[idx].serialNumber = e.target.value; setBatchItems(newBatch); }} 
                            />
                          </td>
                          <td className="p-1">
                            <input 
                              placeholder="Stockroom A"
                              className="w-full bg-transparent p-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#005FB7] outline-none text-xs" 
                              value={item.locationStored} 
                              onChange={(e) => { const newBatch = [...batchItems]; newBatch[idx].locationStored = e.target.value; setBatchItems(newBatch); }} 
                            />
                          </td>
                          <td className="p-1">
                            <select className="w-full bg-transparent p-3 rounded-xl focus:bg-white outline-none text-xs font-bold" value={item.deviceStatus} onChange={(e) => { const newBatch = [...batchItems]; newBatch[idx].deviceStatus = e.target.value; setBatchItems(newBatch); }}>
                              <option value="Working">Working</option>
                              <option value="For Repair">For Repair</option>
                              <option value="Not Working">Not Working</option>
                              <option value="Missing">Missing</option>
                            </select>
                          </td>
                          <td className="p-1">
                            <select className="w-full bg-transparent p-3 rounded-xl focus:bg-white outline-none text-[10px] font-bold" value={item.category} onChange={(e) => { const newBatch = [...batchItems]; newBatch[idx].category = e.target.value; setBatchItems(newBatch); }}>
                              <option value="" disabled>Category</option>
                              {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="p-1 text-center">
                            <button type="button" onClick={() => setBatchItems(batchItems.filter((_, i) => i !== idx))} className="p-2 text-[#74777F] hover:text-[#BA1A1A] hover:bg-[#FFDAD6] rounded-full transition-all">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* SINGLE ADD / EDIT UI */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-300">
              <div className="lg:col-span-7 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Item Code</label>
                    <input name="itemCode" defaultValue={selectedItem?.itemCode ?? ""} placeholder="e.g. ASSET-001" className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-[#005FB7]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Old Item Code</label>
                    <input name="oldItemCode" defaultValue={selectedItem?.oldItemCode ?? ""} placeholder="N/A" className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Item Name / Description</label>
                    <input name="itemName" defaultValue={selectedItem?.itemName ?? ""} placeholder="Enter descriptive name" className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#005FB7] font-semibold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Item Type</label>
                    <input name="itemType" defaultValue={selectedItem?.itemType ?? ""} placeholder="e.g. Hardware" className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Serial Number</label>
                    <input name="serialNumber" defaultValue={selectedItem?.serialNumber ?? ""} placeholder="e.g. ABC123XYZ" className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none font-bold" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Storage Location</label>
                    <input name="locationStored" defaultValue={selectedItem?.locationStored ?? ""} placeholder="e.g. Cabinet A, Shelf 2" className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Condition Status</label>
                    <select name="deviceStatus" defaultValue={selectedItem?.deviceStatus ?? "Working"} className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none font-bold">
                      <option value="Working">Working</option>
                      <option value="For Repair">For Repair</option>
                      <option value="Not Working">Not Working</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Category</label>
                    <select name="category" defaultValue={selectedItem?.category ?? ""} className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none font-bold">
                      <option value="" disabled>Select Category</option>
                      {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Maintenance History</label>
                    <textarea name="maintenanceRecords" defaultValue={selectedItem?.maintenanceRecords ?? ""} placeholder="Log previous repairs or checks..." className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none h-32 resize-none" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-[#74777F] uppercase tracking-widest px-1">Remarks</label>
                    <textarea name="remarks" defaultValue={selectedItem?.remarks ?? ""} placeholder="Additional notes..." className="w-full bg-[#F1F3F8] p-5 rounded-2xl outline-none h-32 resize-none" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-[#005FB7] uppercase tracking-widest px-1">Google Drive Link</label>
                    <input name="gdrive_link" defaultValue={selectedItem?.gdriveLink ?? ""} placeholder="https://drive.google.com/..." className="w-full bg-[#D6E3FF]/30 p-5 rounded-2xl outline-none border border-[#D6E3FF]" onChange={(e) => setTempGdriveLink(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 lg:border-l lg:border-[#E0E2EC] lg:pl-10 h-full">
                <div className="sticky top-0">
                  <p className="text-[10px] font-black text-[#74777F] uppercase mb-4 tracking-[0.2em]">Documentation Preview</p>
                  {(() => {
                    const linkToPreview = selectedItem ? (tempGdriveLink || selectedItem?.gdriveLink) : tempGdriveLink;
                    const fileId = linkToPreview?.match(/\/d\/([a-zA-Z0-9_-]{25,})/)?.[1];
                    return fileId ? (
                      <div className="relative w-full overflow-hidden rounded-[32px] border border-[#E0E2EC] bg-[#F1F3F8]" style={{ paddingBottom: '125%', height: 0 }}>
                        <iframe src={`https://drive.google.com/file/d/${fileId}/preview`} className="absolute top-0 left-0 w-full h-full border-0"></iframe>
                      </div>
                    ) : (
                      <div className="aspect-[3/4] flex flex-col items-center justify-center text-[#74777F] bg-[#F1F3F8] rounded-[32px] border-2 border-dashed border-[#E0E2EC] p-10 text-center opacity-60">
                        <p className="text-[10px] font-black uppercase tracking-widest">No Valid Link Provided</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )
        ) : (
          /* BATCH REVIEW STEP UI - ALL COLUMNS INCLUDED */
          <div className="max-w-7xl mx-auto py-4 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isBatchMode ? (
              <div className="border border-[#E0E2EC] rounded-[24px] bg-white overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#F1F3F8]">
                    <tr>
                      <th className="p-4 text-[10px] font-black text-[#74777F] uppercase">Code</th>
                      <th className="p-4 text-[10px] font-black text-[#74777F] uppercase">Item Name</th>
                      <th className="p-4 text-[10px] font-black text-[#74777F] uppercase">Type</th>
                      <th className="p-4 text-[10px] font-black text-[#74777F] uppercase">Serial No.</th>
                      <th className="p-4 text-[10px] font-black text-[#74777F] uppercase">Location</th>
                      <th className="p-4 text-[10px] font-black text-[#74777F] uppercase">Status</th>
                      <th className="p-4 text-[10px] font-black text-[#74777F] uppercase">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3F8]">
                    {Array.isArray(reviewData) && reviewData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#FDFBFF]">
                        <td className="p-4 text-sm font-bold text-[#005FB7]">{item.itemCode}</td>
                        <td className="p-4 text-sm text-[#1A1C1E]">{item.itemName}</td>
                        <td className="p-4 text-sm text-[#74777F]">{item.itemType || "—"}</td>
                        <td className="p-4 text-sm font-mono text-[#74777F]">{item.serialNumber || "—"}</td>
                        <td className="p-4 text-sm text-[#74777F]">{item.locationStored || "—"}</td>
                        <td className="p-4 text-sm font-bold text-[#74777F]">
                          <span className={`px-2 py-1 rounded text-[10px] ${item.deviceStatus === 'Working' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {item.deviceStatus}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-bold text-[#74777F]">{item.category || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* SINGLE REVIEW UI */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                {reviewData && !Array.isArray(reviewData) && Object.entries(reviewData).map(([key, value]) => (
                  <div key={key} className="border-b border-[#F1F3F8] pb-3">
                    <p className="text-[10px] font-black text-[#74777F] uppercase tracking-widest mb-1">{key.replace(/([A-Z])/g, ' $1').replace('_', ' ')}</p>
                    <p className="text-sm font-bold text-[#1A1C1E] line-clamp-3 whitespace-pre-wrap">{String(value) || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-6 md:p-8 border-t border-[#E0E2EC] bg-white shrink-0">
        <div className="flex flex-col md:flex-row items-center gap-4 w-full">
          {isReviewStep ? (
            <button type="button" onClick={() => setIsReviewStep(false)} className="w-full md:w-auto px-8 py-4 text-[#005FB7] font-black text-xs uppercase tracking-widest hover:bg-[#F1F3F8] rounded-full transition-colors cursor-pointer">Back to Edit</button>
          ) : (
            <>
              {selectedItem && (
                <button type="button" disabled={isSaving} onClick={() => setShowDeleteConfirm(true)} className="w-full md:w-auto order-2 md:order-1 px-8 py-4 text-[#BA1A1A] font-black text-xs uppercase tracking-widest hover:bg-[#FFDAD6] rounded-full transition-colors cursor-pointer disabled:opacity-50">Delete Item</button>
              )}
              <button 
                type="button" 
                disabled={isSaving}
                onClick={() => {
                   const form = document.getElementById('inventory-form') as HTMLFormElement;
                   if (!form) return;
                   const formData = new FormData(form);
                   const currentData = Object.fromEntries(formData.entries());

                   const hasSingleChanges = !isBatchMode && Object.keys(currentData).some(key => {
                       const initialValue = selectedItem ? (selectedItem[key as keyof typeof selectedItem] || "") : "";
                       const currentValue = currentData[key] || "";
                       if (key === 'gdrive_link') return String(currentValue).trim() !== String(selectedItem?.gdriveLink || "").trim();
                       return String(currentValue).trim() !== String(initialValue).trim();
                   });

                   const hasBatchChanges = isBatchMode && (batchItems.length > 1 || (batchItems[0].itemCode.trim() !== "" || batchItems[0].itemName.trim() !== ""));

                   if (hasSingleChanges || hasBatchChanges) {
                       setShowDiscardConfirm(true);
                   } else {
                       setIsModalOpen(false);
                       setIsReviewStep(false);
                       setReviewData(null);
                       setIsBatchMode(false);
                       setTempGdriveLink("");
                   }
                }} 
                className="w-full md:w-auto order-3 md:order-2 md:ml-auto px-8 py-4 text-[#44474E] font-bold text-xs uppercase tracking-widest cursor-pointer hover:bg-[#F1F3F8] rounded-full transition-colors"
              >Discard</button>
            </>
          )}

          <button type="submit" disabled={isSaving || (isBatchMode && !isReviewStep && batchItems.length === 0)} className={`w-full md:w-auto order-1 md:order-3 ${isReviewStep ? 'bg-[#2E6C00] hover:bg-[#235300] md:ml-auto' : 'bg-[#005FB7] hover:bg-[#004ba0]'} text-white px-12 py-5 rounded-full font-bold shadow-xl transition-all text-xs uppercase tracking-widest cursor-pointer active:scale-95 disabled:bg-[#74777F] flex items-center justify-center gap-2`}>
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
    msg="This will remove all items currently entered in the batch table. This action cannot be undone."
    type="danger"
    onConfirm={() => {
      setBatchItems([{ itemCode: "", itemName: "", itemType: "", serialNumber: "", locationStored: "", deviceStatus: "Working", category: "", availabilityStatus: "Available" }]);
      setShowClearBatchConfirm(false);
    }}
    onCancel={() => setShowClearBatchConfirm(false)}
  />
)}

{/* DISCARD CONFIRMATION MODAL */}
{showDiscardConfirm && (
  <ConfirmModal 
    title="Discard Changes?"
    msg="Are you sure you want to discard your progress? Any unsaved information will be permanently lost."
    type="danger"
    onConfirm={() => {
      setShowDiscardConfirm(false);
      setIsModalOpen(false);
      setIsReviewStep(false);
      setReviewData(null);
      setIsBatchMode(false);
      setTempGdriveLink("");
    }}
    onCancel={() => setShowDiscardConfirm(false)}
  />
)}
{/* QR MODAL */}
      {isQRModalOpen && (
        <div className="fixed inset-0 bg-[#1A1C1E]/60 flex items-center justify-center p-4 z-[100] backdrop-blur-xs">
          <div className="bg-white p-10 rounded-[48px] text-center shadow-2xl max-w-sm w-full border border-[#E0E2EC]">
            <h3 className="font-bold text-xl mb-1 text-[#1A1C1E]">{selectedItem?.itemName}</h3>
            <p className="text-xs text-[#005FB7] mb-8 uppercase tracking-widest font-black font-bold">{selectedItem?.itemCode}</p>
            
            <div className="bg-white p-6 inline-block rounded-[32px] mb-1 shadow-inner border border-[#F1F3F8]">
              <QRCodeSVG id="qr-code-svg" value={qrValue} size={200} level="H" />
            </div>

            <div className="space-y-4">

                            {/* CLICK TO COPY LINK SECTION - Entire row is now clickable */}
              <div 
                onClick={() => {
                  navigator.clipboard.writeText(qrValue);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="relative flex items-center bg-[#F1F3F8] p-2 rounded-2xl border border-[#E0E2EC] cursor-pointer hover:bg-[#EDF0F7] transition-all group"
              >
                <input 
                  readOnly 
                  value={qrValue} 
                  className="bg-transparent text-[10px] text-[#44474E] px-3 flex-1 truncate font-medium focus:outline-none cursor-pointer"
                />
                <button 
                  type="button"
                  className="bg-white text-[#005FB7] px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-tight shadow-sm group-hover:bg-[#FDFBFF] transition-colors pointer-events-none"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* DOWNLOAD BUTTON */}
              <button 
                onClick={downloadQRCode} 
                className="w-full bg-[#005FB7] text-white py-5 rounded-full font-bold text-xs uppercase tracking-widest cursor-pointer shadow-lg hover:bg-[#004ba0] transition-all"
              >
                Download QR Code
              </button>



              {/* CLOSE BUTTON */}
              <button 
                onClick={() => setIsQRModalOpen(false)} 
                className="w-full text-[#44474E] py-2 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:opacity-70"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-[#1A1C1E]/60 z-40 lg:hidden backdrop-blur-sm" />
      )}
    </div>
  );
}
// --- SUB-COMPONENTS ---
function ConfirmModal({ title, msg, onConfirm, onCancel, type, isSaving }: any) {
  return (	
    <div className="fixed inset-0 bg-[#1A1C1E]/80 flex items-center justify-center p-4 z-[110] backdrop-blur-md">
      <div className={`bg-white p-10 rounded-[40px] max-w-md w-full shadow-2xl border border-[#E0E2EC] transition-all ${isSaving ? 'opacity-80 scale-95' : 'scale-100'}`}>
        <h3 className={`text-2xl font-bold mb-4 ${type === 'danger' ? 'text-[#BA1A1A]' : 'text-[#005FB7]'}`}>
          {title}
        </h3>
        <p className="text-[#44474E] text-sm leading-relaxed mb-10 font-medium">
          {msg}
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel} 
            disabled={isSaving}
            className="flex-1 py-4 text-[#44474E] font-bold text-xs uppercase tracking-widest cursor-pointer hover:bg-[#F1F3F8] rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          
          <button 
            onClick={onConfirm} 
            disabled={isSaving}
            className={`flex-1 py-4 rounded-full text-white font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${
              isSaving 
                ? 'bg-[#74777F] cursor-not-allowed' 
                : type === 'danger' 
                  ? 'bg-[#BA1A1A] hover:bg-[#93000A] cursor-pointer' 
                  : 'bg-[#005FB7] hover:bg-[#004ba0] cursor-pointer'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}