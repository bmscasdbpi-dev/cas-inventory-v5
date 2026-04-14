"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getItemByCode } from "../actions/itemActions"; 
import { Html5Qrcode } from "html5-qrcode";
import { createWorker } from 'tesseract.js';

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
  const [isOCRMode, setIsOCRMode] = useState<boolean>(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef<boolean>(false);

  // --- Logic: Auto-Detect OCR Loop ---
  useEffect(() => {
    let worker: any = null;
    let intervalId: NodeJS.Timeout;
    let isMounted = true;

    const startOCRProcess = async () => {
      if (!isOCRMode || !showScanner) return;

      try {
        worker = await createWorker('eng');
        
        const processFrame = async () => {
          if (!isMounted || !isOCRMode) return;

          const video = document.querySelector("#reader video") as HTMLVideoElement;
          if (!video || video.paused || video.ended) return;

          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(video, 0, 0);

          try {
            const { data: { text } } = await worker.recognize(canvas);
            
            // STRICT REGEX: Specifically looks for CAS-XX-0000 or CAS-X-00000 formats
            // Disregards other text noise in the frame
            const strictMatch = text.match(/CAS-[A-Z0-9]{1,3}-[0-9]{1,5}/i);
            
            if (strictMatch && isMounted) {
              const code = strictMatch[0].toUpperCase();
              setSearchCode(code);
              handleSearch(code);
              setShowScanner(false);
            }
          } catch (err) {
            console.error("Frame processing error:", err);
          }
        };

        // 1100ms check for faster detection while maintaining battery stability
        intervalId = setInterval(processFrame, 1100);
      } catch (err) {
        console.error("OCR Worker failed:", err);
      }
    };

    startOCRProcess();

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (worker) worker.terminate();
    };
  }, [isOCRMode, showScanner]);

  // --- Logic: Handle Browser Back Button ---
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

  const processScannedText = (text: string) => {
    let finalCode = text.trim();
    if (text.includes("?c=")) {
      try {
        const urlParts = text.split("?c=");
        if (urlParts[1]) finalCode = urlParts[1].split("&")[0];
      } catch (e) {
        console.error("Error parsing QR link:", e);
      }
    }
    return finalCode;
  };

  // --- Logic: Camera Scanner ---
  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const startCamera = async () => {
      timer = setTimeout(async () => {
        const readerElement = document.getElementById("reader");
        if (showScanner && isMounted && readerElement && !isStartingRef.current) {
          try {
            if (scannerRef.current && scannerRef.current.isScanning) return;
            isStartingRef.current = true;
            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
              { facingMode: "environment" },
              { fps: 20, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
              (text) => {
                if (isOCRMode) return;
                const code = processScannedText(text);
                setSearchCode(code);
                handleSearch(code);
                setShowScanner(false);
              },
              () => {}
            );
          } catch (err) {
            console.error("Camera failed to start:", err);
          } finally {
            isStartingRef.current = false;
          }
        }
      }, 350);
    };

    startCamera();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          if (document.getElementById("reader")) {
            scannerRef.current?.clear();
          }
        }).catch(e => console.warn("Stop failed:", e));
      }
    };
  }, [showScanner, isOCRMode]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingImage(true);
    const html5QrCode = new Html5Qrcode("hidden-reader");
    try {
      const text = await html5QrCode.scanFile(file, true);
      const code = processScannedText(text);
      setSearchCode(code);
      handleSearch(code);
    } catch (err) {
      setIsInvalidModalOpen(true);
    } finally {
      setIsParsingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
    <div className="min-h-screen bg-white text-[#1a1c1e] p-4 md:p-8">
      <style>{`
        #reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 32px; }
        #reader { border: none !important; }
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
        .animate-laser { animation: scan 2s linear infinite; }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <div id="hidden-reader" className="hidden"></div>

        {!selectedItem && !showScanner && (
          <div className="flex flex-col items-center justify-center min-h-[85vh] animate-in fade-in duration-700">
            <div className="w-full max-w-md text-center">
              <h1 className="text-2xl font-bold mb-2">CAS Equipment Verification</h1>
              <p className="text-[#44474e] text-sm mb-8">Verify equipment by code, camera, or upload.</p>
              <div className="space-y-4">
                <input 
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Enter item code" 
                    className="w-full border border-[#74777f] p-4 rounded-xl text-center font-bold uppercase outline-none focus:border-[#005fb7] focus:border-2 cursor-text"
                />
                <button 
                  onClick={() => handleSearch()}
                  disabled={loading || !searchCode}
                  className="w-full bg-[#0080ff] text-white py-3.5 rounded-full font-bold h-[48px] disabled:opacity-40 cursor-pointer transition-shadow hover:shadow-md"
                >
                  {loading ? "Verifying..." : "Verify Item"}
                </button>
                <div className="flex items-center gap-4 py-4">
                  <div className="h-px bg-[#e0e2ec] flex-1"></div>
                  <span className="text-xs font-bold text-[#74777f]">or</span>
                  <div className="h-px bg-[#e0e2ec] flex-1"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => { setIsOCRMode(true); setShowScanner(true); }} 
                    className="bg-[#f0f4f9] py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors hover:bg-[#d3e3fd] cursor-pointer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Scan Code
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-[#f0f4f9] py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors hover:bg-[#d3e3fd] cursor-pointer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload Image
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
              </div>
            </div>
          </div>
        )}

        {showScanner && (
          <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-4 flex items-center justify-between border-b border-[#e0e2ec]">
              <button onClick={() => setShowScanner(false)} className="p-2 rounded-full hover:bg-[#f0f4f9] cursor-pointer">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#44474e" strokeWidth="2"><path d="M19 12H5m7 7l-7-7 7-7"/></svg>
              </button>
              <div className="flex bg-[#f0f4f9] p-1 rounded-full border border-[#e0e2ec]">
                <button 
                  onClick={() => setIsOCRMode(true)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${isOCRMode ? 'bg-[#0080ff] text-white shadow-sm' : 'text-[#44474e]'}`}
                >OCR Mode</button>
                <button 
                  onClick={() => setIsOCRMode(false)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${!isOCRMode ? 'bg-[#0080ff] text-white shadow-sm' : 'text-[#44474e]'}`}
                >QR Mode</button>
              </div>
              <div className="w-10"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#f0f4f9]">
              <div className="w-full max-w-sm bg-white p-2 rounded-[40px] shadow-sm border border-[#d3e3fd]">
                <div className="relative aspect-square overflow-hidden rounded-[32px] bg-black">
                  <div id="reader" className="w-full h-full"></div>
                  <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none z-10"></div>
                  <div className={`absolute top-0 left-0 w-full h-1 z-20 transition-all duration-500 ${isOCRMode ? 'animate-pulse h-full bg-blue-500/5 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]' : 'animate-laser bg-white/60 shadow-lg'}`}></div>
                  {isOCRMode && (
                    <div className="absolute top-4 left-0 w-full text-center z-30">
                      <span className="bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full font-bold tracking-widest animate-bounce">AUTO-DETECTING CAS CODE</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-8 text-[#44474e] text-sm text-center bg-white/50 px-6 py-2 rounded-full font-medium">
                {isOCRMode ? "Align the CAS-XX-0000 code in the frame" : "Center the QR code in the frame"}
              </p>
              <button onClick={() => setShowScanner(false)} className="mt-6 px-8 py-3 bg-white text-[#0080ff] border border-[#0080ff] rounded-full text-sm font-bold active:scale-95 cursor-pointer">Close Scanner</button>
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
              {/* Changed whitespace-normal to whitespace-pre-wrap to respect line breaks and spaces */}
              <div className="text-sm text-[#44474e] leading-relaxed px-1 whitespace-pre-wrap break-words">
                {selectedItem.remarks || "No additional remarks or descriptions provided for this asset."}
              </div>
            </div>
          </div>

                  {/* Print Note and Contact Button */}
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

      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[300] flex flex-col items-center justify-center animate-in fade-in">
           <div className="w-12 h-12 border-4 border-[#d3e3fd] border-t-[#005fb7] rounded-full animate-spin mb-4"></div>
           <p className="text-[#005fb7] font-bold text-sm tracking-wide">Verifying...</p>
        </div>
      )}

      {isInvalidModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-6 z-[200]">
          <div className="bg-white rounded-[28px] p-8 w-full max-w-sm text-center shadow-xl border border-[#e0e2ec]">
            <h2 className="text-xl font-medium mb-2">Record not found</h2>
            <p className="text-[#44474e] text-sm mb-8">The code provided doesn't match any registered equipment.</p>
            <button onClick={() => setIsInvalidModalOpen(false)} className="w-full bg-[#005fb7] text-white py-3 rounded-full font-bold text-sm cursor-pointer transition-colors hover:bg-[#004a8f]">Try again</button>
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
