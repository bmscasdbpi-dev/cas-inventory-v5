"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getItemByCode } from "../actions/itemActions"; 
import { Html5Qrcode } from "html5-qrcode";
import Tesseract from "tesseract.js";

function VerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemCodeFromUrl = searchParams.get("c");

  // --- States ---
  const [searchCode, setSearchCode] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isInvalidModalOpen, setIsInvalidModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(!!itemCodeFromUrl);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [isParsingImage, setIsParsingImage] = useState<boolean>(false);
  const [ocrStatus, setOcrStatus] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // --- Logic: Extract code from QR or Text ---
  const extractItemCode = (text: string) => {
    // 1. Check if it's a URL with a query param
    if (text.includes("?c=")) {
      try {
        const urlParts = text.split("?c=");
        if (urlParts[1]) return urlParts[1].split("&")[0].trim().toUpperCase();
      } catch (e) { console.error("URL Parse error", e); }
    }

    // 2. OCR/Regex Match for CAS-XX-XXXX format
    const regex = /CAS-[A-Z0-9]{2}-[A-Z0-9]{4}/i;
    const match = text.match(regex);
    if (match) return match[0].toUpperCase();

    return text.trim().toUpperCase();
  };

  // --- Logic: Browser Back Button ---
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("c");
      if (!code) {
        setSelectedItem(null);
        setSearchCode("");
        setLoading(false);
      } else {
        handleSearch(code);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // --- Initial Check for Direct Links ---
  useEffect(() => {
    if (itemCodeFromUrl && !selectedItem) {
      handleSearch(itemCodeFromUrl);
    }
  }, [itemCodeFromUrl]);

  // --- Logic: Camera Scanner (QR + Fallback Frame Capture for OCR) ---
  useEffect(() => {
    const startCamera = async () => {
      if (showScanner) {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 20,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            (text) => {
              const code = extractItemCode(text);
              setSearchCode(code);
              handleSearch(code);
              setShowScanner(false);
            },
            () => {}
          );
        } catch (err) {
          console.error("Scanner failed to start:", err);
        }
      }
    };

    startCamera();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
        }).catch((e) => console.warn("Stop failed", e));
      }
    };
  }, [showScanner]);

  // --- Logic: OCR from Image Upload ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingImage(true);
    setOcrStatus("Scanning for QR...");

    try {
      // Step 1: Try QR Scanning first
      const html5QrCode = new Html5Qrcode("hidden-reader");
      try {
        const text = await html5QrCode.scanFile(file, true);
        const code = extractItemCode(text);
        setSearchCode(code);
        handleSearch(code);
      } catch (qrErr) {
        // Step 2: Fallback to OCR if QR fails
        setOcrStatus("Reading Text (OCR)...");
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        const code = extractItemCode(text);
        
        // Validate if found code matches format
        if (code && code.includes("CAS-")) {
          setSearchCode(code);
          handleSearch(code);
        } else {
          setIsInvalidModalOpen(true);
        }
      }
    } catch (err) {
      setIsInvalidModalOpen(true);
    } finally {
      setIsParsingImage(false);
      setOcrStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- Logic: Database Search ---
  async function handleSearch(codeToSearch?: string) {
    const code = codeToSearch || searchCode;
    if (!code) return;
    setLoading(true);
    
    const cleanCode = code.trim().toUpperCase();
    try {
        const item = await getItemByCode(cleanCode);
        if (item) {
          setSelectedItem(item);
          if (itemCodeFromUrl !== cleanCode) {
            router.push(`?c=${cleanCode}`, { scroll: false });
          }
        } else {
          setIsInvalidModalOpen(true);
        }
    } catch (error) {
        console.error("Search error:", error);
        setIsInvalidModalOpen(true);
    } finally {
        setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "working" || s === "active") return "text-[#1e8e3e]";
    if (s === "not working" || s === "defective" || s === "broken") return "text-[#ba1a1a]";
    if (s === "missing" || s === "lost") return "text-[#f9ab00]";
    return "text-[#44474e]";
  };

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
        {!selectedItem && !showScanner && (
          <div className="flex flex-col items-center justify-center min-h-[85vh] animate-in fade-in duration-700">
            <div className="w-full max-w-md text-center">
              <h1 className="text-2xl font-bold mb-2 text-[#1a1c1e]">CAS Equipment Verification</h1>
              <p className="text-[#44474e] text-sm mb-8">Verify by code, camera, or item tag photo.</p>

              <div className="space-y-4">
                <input 
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Enter item code (e.g. CAS-01-0001)" 
                    className="w-full bg-white border border-[#74777f] p-4 rounded-xl outline-none text-base focus:border-[#005fb7] focus:border-2 transition-all text-center font-bold uppercase focus:placeholder:text-transparent"
                />
                
                <button 
                  onClick={() => handleSearch()}
                  disabled={loading || !searchCode || isParsingImage}
                  className="w-full bg-[#0080ff] text-white py-3.5 rounded-full font-bold text-sm hover:bg-[#0073e6] transition-all disabled:opacity-40 flex items-center justify-center gap-3 cursor-pointer h-[48px]"
                >
                  {loading || isParsingImage ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : "Verify Item"}
                </button>

                <div className="flex items-center gap-4 py-4">
                  <div className="h-px bg-[#e0e2ec] flex-1"></div>
                  <span className="text-xs font-bold text-[#74777f]">or</span>
                  <div className="h-px bg-[#e0e2ec] flex-1"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setShowScanner(true)} className="bg-[#f0f4f9] text-[#041e49] py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#d3e3fd] transition-colors cursor-pointer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Scan QR
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-[#f0f4f9] text-[#041e49] py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#d3e3fd] transition-colors cursor-pointer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload Label
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
                <p className="text-[10px] text-[#74777f] font-medium mt-2">Upload supports both QR codes and physical CAS text labels.</p>
              </div>
            </div>
          </div>
        )}

        {/* --- View 2: Scanner Screen --- */}
        {showScanner && (
          <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-4 flex items-center justify-between border-b border-[#e0e2ec]">
              <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-[#f0f4f9] rounded-full transition-colors cursor-pointer">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#44474e" strokeWidth="2"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>
              </button>
              <h2 className="text-lg font-medium">Scan Item Code</h2>
              <div className="w-10"></div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f0f4f9]">
              <div className="w-full max-w-sm bg-white p-2 rounded-[40px] shadow-sm border border-[#d3e3fd]">
                <div className="relative aspect-square overflow-hidden rounded-[32px] bg-black">
                  <div id="reader" className="w-full h-full"></div>
                  <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none z-10"></div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/60 shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-laser z-20"></div>
                </div>
              </div>
              <p className="mt-8 text-[#44474e] text-sm text-center bg-white/50 px-6 py-2 rounded-full font-medium">Point at QR code or item label</p>
              <button onClick={() => setShowScanner(false)} className="mt-6 px-8 py-3 bg-white text-[#0080ff] border border-[#0080ff] rounded-full text-sm font-bold shadow-sm hover:bg-[#0080ff] hover:text-white transition-all">
                Close
              </button>
            </div>
          </div>
        )}

        {/* --- View 3: Verified Details --- */}
        {selectedItem && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center mb-8">
              <button 
                onClick={() => { setSelectedItem(null); setSearchCode(""); router.push('?', {scroll:false}); }}
                className="flex items-center gap-2 text-[#005fb7] font-bold text-sm hover:bg-[#d3e3fd]/40 px-4 py-2 rounded-full transition-all cursor-pointer group"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>
                Go back
              </button>
            </div>

            <div className="bg-[#fdfbff] rounded-[32px] border border-[#e0e2ec] overflow-hidden shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between">
                  <div className="space-y-10">
                    <header>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c4eed0] text-[#072711] rounded-full text-[11px] font-bold mb-4">
                        <div className="w-1.5 h-1.5 bg-[#072711] rounded-full"></div>
                        Verified record
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
                          <p className={`text-sm ${info.isBold ? "font-bold" : "font-medium"} ${info.color || "text-[#1a1c1e]"}`}>{info.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-[#44474e] px-1">Item remarks</h4>
                      <div className="text-sm text-[#44474e] leading-relaxed px-1 whitespace-pre-wrap break-words">
                        {selectedItem.remarks || "No additional remarks or descriptions provided for this asset."}
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-6 border-t border-[#e0e2ec] space-y-4">
                    <p className="text-[11px] text-[#74777f] italic leading-snug">
                      This item is verified and property of Creative Arts Section at Don Bosco Press, Inc.
                    </p>
                    <button 
                      onClick={() => window.location.href = 'mailto:cas.dbpi@gmail.com'}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0080ff] text-white rounded-full text-xs font-bold hover:bg-[#0067e6] transition-colors shadow-sm cursor-pointer"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      Item was Found? Contact Us Immediately
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#f0f4f9] p-6 md:p-10 flex flex-col">
                  <p className="text-xs font-bold text-[#74777f] mb-6">Item Profile</p>
                  <div className="flex-1 min-h-[450px] bg-white rounded-2xl border border-[#d3e3fd] overflow-hidden shadow-inner relative">
                    {(() => {
                      const fileIdMatch = selectedItem?.gdriveLink?.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
                      const fileId = fileIdMatch ? fileIdMatch[1] : null;
                      if (fileId) {
                        return (
                          <iframe 
                            src={`https://drive.google.com/file/d/${fileId}/preview`} 
                            className="absolute inset-0 w-full h-full border-0" 
                            allow="autoplay"
                          ></iframe>
                        );
                      }
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                          <svg className="w-12 h-12 text-[#c4c7c5] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                          </svg>
                          <p className="text-sm font-medium text-[#74777f]">No digital document attached.</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Global Loading/OCR Modal --- */}
      {(loading || isParsingImage) && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[300] flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="w-12 h-12 border-4 border-[#d3e3fd] border-t-[#005fb7] rounded-full animate-spin mb-4"></div>
           <p className="text-[#005fb7] font-bold text-sm tracking-wide uppercase">
            {isParsingImage ? (ocrStatus || "Reading Label...") : "Verifying..."}
           </p>
        </div>
      )}

      {/* --- Error Modal --- */}
      {isInvalidModalOpen && (
        <div className="fixed inset-0 bg-[#041e49]/30 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
          <div className="bg-white rounded-[28px] p-8 w-full max-w-sm text-center shadow-xl border border-[#e0e2ec]">
            <h2 className="text-xl font-medium mb-2">Record not found</h2>
            <p className="text-[#44474e] text-sm mb-8">The code provided doesn't match any registered equipment.</p>
            <button onClick={() => setIsInvalidModalOpen(false)} className="w-full bg-[#005fb7] text-white py-3 rounded-full font-bold text-sm cursor-pointer">
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>}>
      <VerificationContent />
    </Suspense>
  );
}
