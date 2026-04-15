"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getItemByCode, submitFoundReport } from "../actions/itemActions"; 
import { Html5Qrcode } from "html5-qrcode";
import Tesseract from "tesseract.js";

function VerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemCodeFromUrl = searchParams.get("c");

  // --- Verification States ---
  const [searchCode, setSearchCode] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isInvalidModalOpen, setIsInvalidModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!!itemCodeFromUrl);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [isParsingImage, setIsParsingImage] = useState<boolean>(false);
  const [ocrStatus, setOcrStatus] = useState<string>("");
  const [showCancel, setShowCancel] = useState<boolean>(false);

  // --- Bulk Report System States ---
  const [showReportForm, setShowReportForm] = useState<boolean>(false);
  const [foundItemsList, setFoundItemsList] = useState<any[]>([]); 
  const [isReporting, setIsReporting] = useState<boolean>(false);
  const [reportPhoto, setReportPhoto] = useState<File | null>(null);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState<boolean>(false);
  const [reportData, setReportData] = useState({
    description: "",
    location: "",
    foundBy: "",
    contactNumber: ""
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportPhotoRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const liveOcrIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cancelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialSearched = useRef(false);
  const isVerifyingRef = useRef(false);

  // --- Helpers ---
  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); 
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); 
    } catch (e) { console.error(e); }
  };

  const getFormattedDate = () => {
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(new Date());
  };

  /**
   * FIX: Clean Reset Logic
   * Forces the UI back to View 1 by clearing all states and stripping the URL.
   */
  const resetVerification = () => {
    // 1. Clear Data States
    setSelectedItem(null);
    setSearchCode("");
    setLoading(false);
    setIsParsingImage(false);
    setShowCancel(false);
    setShowReportForm(false);
    setReportSuccess(false);
    setFoundItemsList([]);
    setReportPhoto(null);
    setOcrStatus("");
    
    // 2. Clear Logic Locks
    isVerifyingRef.current = false;
    hasInitialSearched.current = false; 
    
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    
    // 3. Clean URL and Navigation
    // Use window.history to ensure the browser doesn't think it needs to reload the 'c' param
    window.history.replaceState(null, "", window.location.pathname);
    router.replace('/', { scroll: true });
  };

  const removeReportPhoto = () => {
    setReportPhoto(null);
    if (reportPhotoRef.current) reportPhotoRef.current.value = "";
  };

  const removeItemFromBulkList = (code: string) => {
    setFoundItemsList(prev => prev.filter(i => i.itemCode !== code));
  };

  const extractItemCode = (text: string) => {
    if (text.includes("?c=")) {
      try {
        const urlParts = text.split("?c=");
        if (urlParts[1]) return urlParts[1].split("&")[0].trim().toUpperCase();
      } catch (e) { console.error(e); }
    }
    const regex = /CAS-[A-Z0-9]{2}-[A-Z0-9]{4}/i;
    const match = text.match(regex);
    return match ? match[0].toUpperCase() : text.trim().toUpperCase();
  };

  // --- Core Functions ---
  const runLiveOCR = async () => {
    if (isVerifyingRef.current) return;

    const videoElement = document.querySelector("#reader video") as HTMLVideoElement;
    if (!videoElement || videoElement.paused || videoElement.ended) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = "contrast(1.4) grayscale(1)";
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    try {
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
      const foundCode = extractItemCode(text);
      if (foundCode && foundCode.startsWith("CAS-") && foundCode.length >= 11) {
        if (!isVerifyingRef.current) {
            isVerifyingRef.current = true;
            playSuccessSound(); 
            setSearchCode(foundCode);
            handleSearch(foundCode);
            setShowScanner(false);
        }
      }
    } catch (e) {
      isVerifyingRef.current = false;
    }
  };

  async function handleSearch(codeToSearch?: string) {
    const code = codeToSearch || searchCode;
    if (!code) {
      setLoading(false);
      isVerifyingRef.current = false;
      return;
    }

    setLoading(true);
    // Prepare for new display
    setSelectedItem(null); 

    try {
        const item = await getItemByCode(code.trim().toUpperCase());
        if (item) {
          if (showReportForm) {
            if (foundItemsList.find(i => i.itemCode === item.itemCode)) {
                setIsDuplicateModalOpen(true);
            } else {
                setFoundItemsList(prev => [...prev, item]);
                playSuccessSound();
            }
          } else {
            setSelectedItem(item);
            // Push the code to URL so it's shareable, but don't scroll
            router.push(`?c=${code.toUpperCase()}`, { scroll: false });
          }
          setSearchCode("");
        } else { 
          setIsInvalidModalOpen(true); 
        }
    } catch (error) { 
        setIsInvalidModalOpen(true); 
    }
    finally { 
        setLoading(false);
        isVerifyingRef.current = false; 
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB limit. Please upload a smaller image.");
        e.target.value = "";
        return;
      }
      setReportPhoto(file);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isVerifyingRef.current) return;
    
    isVerifyingRef.current = true;
    setIsParsingImage(true);
    setOcrStatus("Processing...");
    try {
      const html5QrCode = new Html5Qrcode("hidden-reader");
      try {
        const text = await html5QrCode.scanFile(file, true);
        const code = extractItemCode(text);
        playSuccessSound();
        handleSearch(code);
      } catch (qrErr) {
        setOcrStatus("Reading Text...");
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        const code = extractItemCode(text);
        if (code && code.includes("CAS-")) { 
          playSuccessSound(); 
          handleSearch(code); 
        }
        else { setIsInvalidModalOpen(true); }
      }
    } catch (err) { setIsInvalidModalOpen(true); }
    finally { 
        setIsParsingImage(false); 
        setOcrStatus(""); 
        isVerifyingRef.current = false;
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (foundItemsList.length === 0) {
        alert("Please add at least one item to the report.");
        return;
    }
    setIsReporting(true);
    const formData = new FormData();
    formData.append("date", new Date().toLocaleDateString());
    formData.append("itemCodes", foundItemsList.map(i => i.itemCode).join(", "));
    formData.append("itemNames", foundItemsList.map(i => i.itemName).join(", "));
    formData.append("description", reportData.description);
    formData.append("location", reportData.location);
    formData.append("foundBy", reportData.foundBy);
    formData.append("contactNumber", reportData.contactNumber);
    if (reportPhoto) formData.append("photo", reportPhoto);

    try {
      const result = await submitFoundReport(formData); 
      if (result.success) {
        setReportSuccess(true);
      }
    } catch (error) {
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsReporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "working" || s === "active") return "text-[#1e8e3e]";
    if (s === "not working" || s === "defective") return "text-[#ba1a1a]";
    return "text-[#44474e]";
  };

  // --- Effects ---
  useEffect(() => {
    if (loading || isParsingImage) {
      cancelTimerRef.current = setTimeout(() => setShowCancel(true), 5000);
    } else {
      setShowCancel(false);
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    }
    return () => { if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current); };
  }, [loading, isParsingImage]);

  // Sync URL changes with view state
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("c");
      if (!code) { 
        setSelectedItem(null);
        setShowReportForm(false);
        setSearchCode("");
        hasInitialSearched.current = false;
        isVerifyingRef.current = false;
      } else if (code !== selectedItem?.itemCode) { 
        handleSearch(code); 
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedItem]);

  // Initial load check
  useEffect(() => {
    if (itemCodeFromUrl && !selectedItem && !hasInitialSearched.current) {
        hasInitialSearched.current = true;
        handleSearch(itemCodeFromUrl);
    } else if (!itemCodeFromUrl) {
        setLoading(false);
        setSelectedItem(null);
    }
  }, [itemCodeFromUrl]);

  // Scanner Logic
  useEffect(() => {
    const startCamera = async () => {
      if (showScanner) {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;
          await html5QrCode.start(
            { facingMode: "environment" },
            { fps: 30, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0,
              videoConstraints: { width: { min: 1280, ideal: 1920 }, height: { min: 720, ideal: 1080 }, facingMode: "environment" }
            },
            (text) => {
              if (!isVerifyingRef.current) {
                  isVerifyingRef.current = true;
                  playSuccessSound();
                  const code = extractItemCode(text);
                  setSearchCode(code);
                  handleSearch(code);
                  setShowScanner(false);
              }
            },
            () => {}
          );
          liveOcrIntervalRef.current = setInterval(runLiveOCR, 1500);
        } catch (err) { 
            console.error(err); 
            isVerifyingRef.current = false; 
        }
      }
    };
    startCamera();
    return () => {
      if (liveOcrIntervalRef.current) clearInterval(liveOcrIntervalRef.current);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.warn);
      }
    };
  }, [showScanner]);

  return (
    <div className="min-h-screen bg-white text-[#1a1c1e] p-4 md:p-8 selection:bg-[#d3e3fd]">
      <style>{`
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 32px; }
        #reader { border: none !important; }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
        .animate-laser { animation: scan 2s linear infinite; }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div id="hidden-reader" className="hidden"></div>

        {/* --- View 1: Search Screen --- */}
        {!selectedItem && !showScanner && !showReportForm && (
          <div className="flex flex-col items-center justify-center min-h-[85vh] animate-in fade-in duration-700">
            <div className="w-full max-w-md text-center">
              <h1 className="text-2xl font-bold mb-2 text-[#1a1c1e]">CAS Equipment Verification</h1>
              <p className="text-[#44474e] mb-8" style={{ fontSize: '15px' }}>Instant QR and Item Code recognition.</p>
              <div className="space-y-4">
                <input value={searchCode} onChange={(e) => setSearchCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Enter item code (e.g. CAS-01-0001)" className="w-full bg-white border border-[#74777f] p-4 rounded-xl outline-none focus:border-[#005fb7] focus:border-2 transition-all text-center font-bold uppercase" style={{ fontSize: '15px' }} />
                <button onClick={() => handleSearch()} disabled={loading || !searchCode || isParsingImage} className="w-full bg-[#0080ff] text-white py-3.5 rounded-full font-bold hover:bg-[#0073e6] transition-all disabled:opacity-40 flex items-center justify-center gap-3 h-[48px] cursor-pointer" style={{ fontSize: '15px' }}>
                  {loading || isParsingImage ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Verify Item"}
                </button>
                <div className="flex items-center gap-4 py-4">
                  <div className="h-px bg-[#e0e2ec] flex-1"></div>
                  <span className="text-xs font-bold text-[#74777f]">or</span>
                  <div className="h-px bg-[#e0e2ec] flex-1"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowScanner(true)} className="bg-[#f0f4f9] text-[#041e49] py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#d3e3fd] transition-colors cursor-pointer" style={{ fontSize: '15px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> Scan QR / Text
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-[#f0f4f9] text-[#041e49] py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#d3e3fd] transition-colors cursor-pointer" style={{ fontSize: '15px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Label
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
                <button 
                    onClick={() => { setShowReportForm(true); setFoundItemsList([]); }}
                    className="mt-6 font-bold text-[#74777f] hover:underline flex items-center justify-center w-full gap-2 cursor-pointer"
                    style={{ fontSize: '15px' }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                    Report Found Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- View 2: Scanner Screen --- */}
        {showScanner && (
          <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-4 flex items-center justify-between border-b border-[#e0e2ec]">
              <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-[#f0f4f9] rounded-full transition-colors cursor-pointer"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#44474e" strokeWidth="2"><path d="M19 12H5m7 7l-7-7 7-7"/></svg></button>
              <h2 className="text-lg font-medium">Smart Scanner</h2><div className="w-10"></div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f0f4f9]">
              <div className="w-full max-w-sm bg-white p-2 rounded-[40px] shadow-sm border border-[#d3e3fd]">
                <div className="relative aspect-square overflow-hidden rounded-[32px] bg-black">
                  <div id="reader" className="w-full h-full"></div>
                  <div className="absolute inset-0 border-[35px] border-black/40 pointer-events-none z-10"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/60 shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-laser z-20"></div>
                </div>
              </div>
              <p className="mt-8 text-[#44474e] text-center bg-white/50 px-6 py-2 rounded-full font-medium" style={{ fontSize: '15px' }}>Align QR code or Text Label in the frame</p>
              <button onClick={() => setShowScanner(false)} className="mt-6 px-8 py-3 bg-white text-[#0080ff] border border-[#0080ff] rounded-full font-bold shadow-sm hover:bg-[#0080ff] hover:text-white transition-all cursor-pointer" style={{ fontSize: '15px' }}>Close</button>
            </div>
          </div>
        )}

        {/* --- View 3: Verified Details --- */}
        {selectedItem && !showReportForm && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-8">
              <button onClick={resetVerification} className="flex items-center gap-2 text-[#005fb7] font-bold hover:bg-[#d3e3fd]/40 px-4 py-2 rounded-full transition-all cursor-pointer group" style={{ fontSize: '15px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m7 7l-7-7 7-7"/></svg> Go back
              </button>
              <button 
                onClick={() => { setShowReportForm(true); setFoundItemsList([selectedItem]); }} 
                className="px-5 py-2 bg-[#ba1a1a] text-white rounded-full font-bold shadow-sm hover:bg-[#93000a] transition-colors flex items-center gap-2 cursor-pointer"
                style={{ fontSize: '15px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Report Item Found
              </button>
            </div>

            <div className="bg-[#fdfbff] rounded-[32px] border border-[#e0e2ec] overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between">
                  <div className="space-y-10">
                    <header>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c4eed0] text-[#072711] rounded-full text-[11px] font-bold mb-4">
                        <div className="w-1.5 h-1.5 bg-[#072711] rounded-full"></div> Verified record
                      </div>
                      <h1 className="text-lg font-bold text-[#1a1c1e] mb-2">{selectedItem.itemName}</h1>
                      <span className="text-xs font-bold text-[#005fb7] bg-[#d3e3fd] px-2 py-0.5 rounded-md">{selectedItem.itemCode}</span>
                    </header>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      {[
                        { label: "Item Condition:", value: selectedItem.deviceStatus || "Working", color: getStatusColor(selectedItem.deviceStatus || "Working"), isBold: true },
                        { label: "Category", value: selectedItem.itemType || "General equipment" },
                        { label: "Serial number", value: selectedItem.serialNumber || "No serial found" },
                        { label: "Location:", value: selectedItem.locationStored || "Not assigned" }
                      ].map((info, idx) => (
                        <div key={idx} className="border-b border-[#e0e2ec] pb-2">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#74777f] mb-1">{info.label}</p>
                          <p className={`${info.isBold ? "font-bold" : "font-medium"} ${info.color || "text-[#1a1c1e]"}`} style={{ fontSize: '15px' }}>{info.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-[#44474e] px-1">Item remarks</h4>
                      <div className="text-[#44474e] leading-relaxed px-1 whitespace-pre-wrap break-words" style={{ fontSize: '15px' }}>{selectedItem.remarks || "No additional remarks provided."}</div>
                    </div>
                  </div>
                  <div className="mt-12 pt-6 border-t border-[#e0e2ec] space-y-4">
                    <p className="text-[11px] text-[#74777f] italic leading-snug">Verified property of Creative Arts Section at Don Bosco Press, Inc.</p>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#f0f4f9] p-6 md:p-10 flex flex-col items-center">
                  <p className="text-xs font-bold text-[#74777f] mb-6 self-start uppercase tracking-widest">Item Profile</p>
                  <div 
                    className="w-full bg-white rounded-2xl border border-[#d3e3fd] overflow-hidden relative shadow-inner"
                    style={{ aspectRatio: '8.5 / 11', minHeight: '600px' }}
                  >
                    {(() => {
                      const fileIdMatch = selectedItem?.gdriveLink?.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
                      const fileId = fileIdMatch ? fileIdMatch[1] : null;
                      return fileId ? (
                        <iframe 
                          src={`https://drive.google.com/file/d/${fileId}/preview`} 
                          className="absolute inset-0 w-full h-full border-0" 
                          allow="autoplay"
                        ></iframe>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                          <svg className="w-12 h-12 text-[#c4c7c5] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          <p className="font-medium text-[#74777f]" style={{ fontSize: '15px' }}>No document attached.</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- View 4: BULK REPORT SYSTEM --- */}
        {showReportForm && (
          <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 pb-10">
            <div className="flex items-center mb-6">
              <button 
                type="button"
                onClick={() => setIsCancelModalOpen(true)} 
                className="p-2 hover:bg-[#f0f4f9] rounded-full transition-colors cursor-pointer"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#44474e" strokeWidth="2">
                  <path d="M19 12H5m7 7l-7-7 7-7"/>
                </svg>
              </button>
              <h2 className="text-xl font-bold ml-2 text-[#005fb7]">Found Item Report Form</h2>
            </div>

            <div className="bg-white rounded-[32px] border-2 border-[#005fb7] p-6 md:p-8 shadow-xl">
              {reportSuccess ? (
                <div className="text-center py-10" style={{ fontSize: '15px' }}>
                  <div className="w-16 h-16 bg-[#c4eed0] text-[#072711] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold">Report Submitted Successfully!</h3>
                  <p className="text-[#44474e] mt-2">The assets have been recorded. Thank you.</p>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="flex flex-col gap-6" style={{ fontSize: '15px' }}>
                  <div className="space-y-2">
                    <label className="font-bold uppercase text-[#74777f]" style={{ fontSize: '12px' }}>Date of Report</label>
                    <input 
                      type="text" 
                      readOnly 
                      value={getFormattedDate()} 
                      className="w-full bg-[#f0f4f9] p-3 rounded-xl outline-none font-medium border border-transparent"
                      style={{ fontSize: '15px' }}
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <label className="font-bold uppercase text-[#74777f]" style={{ fontSize: '12px' }}>List of Found Items</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-[#e0e2ec] p-3 rounded-xl bg-[#fafafa]">
                      {foundItemsList.length === 0 && (
                        <p className="text-[#74777f] italic text-center py-4" style={{ fontSize: '15px' }}>No items added yet.</p>
                      )}
                      {foundItemsList.map((item) => (
                        <div key={item.itemCode} className="flex items-center justify-between bg-white border border-[#d3e3fd] p-3 rounded-xl animate-in slide-in-from-left-2">
                          <div>
                            <p className="font-bold" style={{ fontSize: '15px' }}>{item.itemName}</p>
                            <p className="text-[#005fb7] font-bold" style={{ fontSize: '15px' }}>{item.itemCode}</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeItemFromBulkList(item.itemCode)} 
                            className="text-red-800 p-1.5 hover:bg-red-50 rounded-full cursor-pointer"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        value={searchCode} 
                        onChange={(e) => setSearchCode(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                        placeholder="Item Code" 
                        className="flex-1 bg-[#f0f4f9] border border-[#e0e2ec] p-3 rounded-xl outline-none font-bold uppercase focus:border-[#005fb7] transition-all" 
                        style={{ fontSize: '15px' }}
                      />
                      <button 
                        type="button" 
                        onClick={() => handleSearch()} 
                        disabled={!searchCode}
                        className="px-4 bg-[#005fb7] text-white rounded-xl font-bold hover:bg-[#004a91] cursor-pointer"
                        style={{ fontSize: '15px' }}
                      >
                        ADD
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold uppercase text-[#74777f]" style={{ fontSize: '12px' }}>Items Description</label>
                    <textarea 
                      required 
                      value={reportData.description} 
                      onChange={(e) => setReportData({...reportData, description: e.target.value})} 
                      placeholder="Describe condition..." 
                      className="w-full border border-[#e0e2ec] p-3 rounded-xl min-h-[100px] outline-none focus:border-[#005fb7] transition-all" 
                      style={{ fontSize: '15px' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold uppercase text-[#74777f]" style={{ fontSize: '12px' }}>Location Found</label>
                    <input 
                      required 
                      type="text" 
                      value={reportData.location} 
                      onChange={(e) => setReportData({...reportData, location: e.target.value})} 
                      placeholder="Where?" 
                      className="w-full border border-[#e0e2ec] p-3 rounded-xl outline-none focus:border-[#005fb7] transition-all" 
                      style={{ fontSize: '15px' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold uppercase text-[#74777f]" style={{ fontSize: '12px' }}>Photo Evidence</label>
                    {!reportPhoto ? (
                      <button 
                        type="button" 
                        onClick={() => reportPhotoRef.current?.click()} 
                        className="w-full border-2 border-dashed border-[#e0e2ec] rounded-2xl p-6 flex flex-col items-center gap-2 hover:bg-blue-50 cursor-pointer"
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#005fb7" strokeWidth="2">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                        </svg>
                        <span className="text-[#005fb7] font-bold" style={{ fontSize: '15px' }}>Attach Photo</span>
                      </button>
                    ) : (
                      <div className="p-4 bg-blue-50 flex items-center justify-between border border-[#005fb7] rounded-xl">
                        <p className="font-bold text-[#005fb7] truncate">{reportPhoto.name}</p>
                        <button type="button" onClick={removeReportPhoto} className="text-red-600 font-bold ml-2">REMOVE</button>
                      </div>
                    )}
                    <input type="file" ref={reportPhotoRef} onChange={handlePhotoChange} accept="image/*" capture="environment" className="hidden" />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#e0e2ec]">
                    <input required type="text" value={reportData.foundBy} onChange={(e) => setReportData({...reportData, foundBy: e.target.value})} placeholder="Your Name" className="w-full border border-[#e0e2ec] p-3 rounded-xl outline-none" style={{ fontSize: '15px' }} />
                    <input required type="tel" value={reportData.contactNumber} onChange={(e) => setReportData({...reportData, contactNumber: e.target.value})} placeholder="Contact Number" className="w-full border border-[#e0e2ec] p-3 rounded-xl outline-none" style={{ fontSize: '15px' }} />
                  </div>

                  <button 
                    type="submit" 
                    disabled={isReporting} 
                    className="w-full bg-[#005fb7] text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer"
                    style={{ fontSize: '15px' }}
                  >
                    {isReporting ? "Sending..." : "Submit Report"}
                  </button>
                </form>
              )}
            </div>

            {isDuplicateModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[700] flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white rounded-[28px] p-8 w-full max-w-sm text-center">
                  <h2 className="text-xl font-bold mb-3">Already Added</h2>
                  <button type="button" onClick={() => setIsDuplicateModalOpen(false)} className="w-full bg-[#005fb7] text-white py-3 rounded-full font-bold cursor-pointer">Got it</button>
                </div>
              </div>
            )}

            {isCancelModalOpen && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[600] flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white rounded-[28px] p-8 w-full max-w-sm text-center">
                  <h2 className="text-xl font-bold mb-3">Cancel Report?</h2>
                  <div className="flex flex-col gap-3">
                    <button type="button" onClick={() => { removeReportPhoto(); setShowReportForm(false); setIsCancelModalOpen(false); }} className="w-full bg-red-600 text-white py-3 rounded-full font-bold cursor-pointer">Yes, Cancel</button>
                    <button type="button" onClick={() => setIsCancelModalOpen(false)} className="w-full bg-[#f0f4f9] text-[#1a1c1e] py-3 rounded-full font-bold cursor-pointer">No</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- Modals & Loading --- */}
        {(loading || isParsingImage) && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[300] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-12 h-12 border-4 border-[#d3e3fd] border-t-[#005fb7] rounded-full animate-spin mb-4"></div>
            <p className="text-[#005fb7] font-bold tracking-wide uppercase" style={{ fontSize: '15px' }}>{isParsingImage ? (ocrStatus || "Reading...") : "Verifying..."}</p>
            {showCancel && <button onClick={resetVerification} className="mt-8 px-6 py-2.5 bg-white border border-red-600 text-red-600 rounded-full font-bold shadow-sm cursor-pointer" style={{ fontSize: '15px' }}>Cancel Verification</button>}
          </div>
        )}

        {isInvalidModalOpen && (
          <div className="fixed inset-0 bg-[#041e49]/30 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
            <div className="bg-white rounded-[28px] p-8 w-full max-w-sm text-center shadow-xl border border-[#e0e2ec]">
              <h2 className="text-xl font-medium mb-2">Record not found</h2>
              <p className="text-[#44474e] mb-8" style={{ fontSize: '15px' }}>The code doesn't match any registered equipment.</p>
              <button onClick={() => setIsInvalidModalOpen(false)} className="w-full bg-[#005fb7] text-white py-3 rounded-full font-bold cursor-pointer" style={{ fontSize: '15px' }}>Try again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white" style={{ fontSize: '15px' }}>Loading...</div>}>
      <VerificationContent />
    </Suspense>
  );
}
