"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getReportedItems } from "@/actions/adminActions";

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    const result = await getReportedItems();
    if (result.success) {
      setReports(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Filter logic matching the logbook style
  const filteredReports = reports.filter(
    (r) =>
      r.reporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.itemCodes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBFF]">
        <div className="w-12 h-12 border-4 border-[#E2E2E6] border-t-[#005FB7] rounded-full animate-spin mb-4"></div>
      </div>
    );

  return (
    <div className="flex min-h-screen bg-[#FDFBFF] text-[#1A1C1E] font-sans overflow-x-hidden">
      {/* SIDEBAR - Exact match to Logbook */}
      <aside
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h2 className={`font-bold text-[#005FB7] tracking-tight whitespace-nowrap ${sidebarMinimized ? "lg:hidden block" : "block"}`}>
              Admin Panel
            </h2>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            <button
              onClick={() => router.push("/dashboard")}
              className={`w-full flex items-center gap-4 p-3.5 rounded-xl text-[#44474E] hover:bg-[#EDF0F7] cursor-pointer ${sidebarMinimized ? "lg:justify-center" : ""}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" /></svg>
              {!sidebarMinimized && <span className="font-semibold text-sm">Inventory</span>}
            </button>
            <button
              onClick={() => router.push("/dashboard/reports")}
              className={`w-full flex items-center gap-4 p-3.5 rounded-xl bg-[#D6E3FF] text-[#001B3E] cursor-pointer ${sidebarMinimized ? "lg:justify-center" : ""}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" /></svg>
              {!sidebarMinimized && <span className="font-semibold text-sm">Found Reports</span>}
            </button>
          </nav>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${sidebarMinimized ? "lg:ml-20" : "lg:ml-72"}`}>
        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-[#FDFBFF]/90 backdrop-blur-xl border-b border-[#E0E2EC] h-20 flex items-center px-4 lg:px-8">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2.5 mr-3 text-[#44474E]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>

          <div className="flex-1 flex justify-start lg:justify-center">
            <div className="relative w-full max-w-xl group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-[#74777F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
              <input
                type="text"
                placeholder="Search reported items, locations, or reporters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F1F3F8] border-none text-sm rounded-full py-3.5 pl-12 pr-4 focus:ring-2 focus:ring-[#005FB7]/20 focus:bg-white transition-all outline-none text-[#1A1C1E]"
              />
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <h1 className="text-xl font-semibold text-[#1A1C1E]">Found Item Logbook</h1>
              <p className="text-[#74777F] text-sm">Verified records of items found within the premises.</p>
            </div>
            <button
              onClick={loadReports}
              className="w-full sm:w-auto bg-[#005FB7] text-white px-6 py-3 rounded-2xl font-semibold text-sm shadow-sm hover:bg-[#004A8F] transition-all cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          {/* MAIN LIST CONTAINER */}
          <div className="bg-white rounded-[24px] lg:rounded-[28px] border border-[#E0E2EC] overflow-hidden shadow-sm">
            {/* Desktop Header - Column Grid matching Logbook style */}
            <div className="hidden lg:grid lg:grid-cols-[1.2fr_1.5fr_1.2fr_1fr_0.8fr] bg-[#F7F9FF] px-8 py-4 text-xs font-bold text-[#74777F] border-b border-[#E0E2EC] uppercase tracking-wider">
              <span>Reported By</span>
              <span>Items Found</span>
              <span>Location</span>
              <span>Report Date</span>
              <span className="text-center">Action</span>
            </div>

            <div className="divide-y divide-[#E0E2EC]">
              {filteredReports.length === 0 ? (
                <div className="p-20 text-center text-[#74777F] text-sm">No reported items found.</div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="flex flex-col lg:grid lg:grid-cols-[1.2fr_1.5fr_1.2fr_1fr_0.8fr] lg:items-center p-6 lg:px-8 lg:py-5 hover:bg-[#F8FAFF] transition-colors cursor-pointer group gap-4 lg:gap-0"
                  >
                    {/* 1. Reporter */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#D6E3FF] rounded-full flex items-center justify-center text-xs font-bold text-[#001B3E] shrink-0">
                        {report.reporterName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-[#1A1C1E] truncate block">{report.reporterName}</span>
                        <p className="text-[10px] text-[#74777F] font-medium">{report.contactNumber}</p>
                      </div>
                    </div>

                    {/* 2. Item Codes/Names */}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#005FB7] truncate">{report.itemCodes}</p>
                      <p className="text-xs font-medium text-[#44474E] truncate">{report.itemNames}</p>
                    </div>

                    {/* 3. Location */}
                    <div className="text-sm font-medium text-[#44474E]">{report.location}</div>

                    {/* 4. Date */}
                    <div className="text-sm font-medium text-[#74777F]">{report.reportDate}</div>

                    {/* 5. View Button */}
                    <div className="lg:text-center">
                      <span className="text-[10px] font-black uppercase tracking-tighter px-4 py-1.5 rounded-xl bg-[#F1F3F8] text-[#005FB7] border border-[#E0E2EC] group-hover:bg-[#005FB7] group-hover:text-white transition-all">
                        View Details
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* DETAIL MODAL - Enhanced Sheet Style */}
      {selectedReport && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-8 border-b flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-[#1A1C1E]">Found Item Verification</h2>
                <p className="text-[10px] font-black text-[#74777F] uppercase tracking-widest mt-1">
                  Reference: {selectedReport.reportReferenceId}
                </p>
              </div>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-[#F1F3F8] rounded-full cursor-pointer">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 lg:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Information Column */}
                <div className="space-y-8">
                  <section>
                    <label className="text-[11px] font-black text-[#74777F] uppercase tracking-widest block mb-3">Item Classification</label>
                    <div className="p-5 bg-[#F7F9FF] rounded-[24px] border border-[#D6E3FF]">
                      <p className="font-mono font-bold text-[#005FB7] text-sm mb-1">{selectedReport.itemCodes}</p>
                      <p className="font-bold text-[#1A1C1E] text-base">{selectedReport.itemNames}</p>
                    </div>
                  </section>

                  <section>
                    <label className="text-[11px] font-black text-[#74777F] uppercase tracking-widest block mb-3">Condition Notes</label>
                    <p className="text-sm leading-relaxed text-[#44474E] bg-white border border-[#E0E2EC] p-5 rounded-[24px]">
                      {selectedReport.description || "No specific details provided."}
                    </p>
                  </section>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[11px] font-black text-[#74777F] uppercase tracking-widest block mb-1">Found Location</label>
                      <p className="font-bold text-sm">{selectedReport.location}</p>
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-[#74777F] uppercase tracking-widest block mb-1">Found By</label>
                      <p className="font-bold text-sm">{selectedReport.reporterName}</p>
                      <p className="text-[#005FB7] text-xs font-bold">{selectedReport.contactNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Evidence Column */}
                <div className="flex flex-col">
                  <label className="text-[11px] font-black text-[#74777F] uppercase tracking-widest block mb-3">Evidence Photo</label>
                  <div className="flex-1 bg-gray-50 rounded-[32px] border-2 border-dashed border-[#E0E2EC] overflow-hidden flex items-center justify-center relative min-h-[400px]">
                    {selectedReport.photoUrl ? (
                      <img src={selectedReport.photoUrl} alt="Found item" className="absolute inset-0 w-full h-full object-contain p-4" />
                    ) : (
                      <div className="text-center opacity-20">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <p className="text-[10px] font-black uppercase tracking-widest">No Attachment</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-[#F8FAFF] border-t flex justify-end gap-4">
              <button onClick={() => setSelectedReport(null)} className="px-8 py-4 bg-white border border-[#E0E2EC] rounded-2xl text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-gray-50 transition-all">
                Close
              </button>
              <button className="px-10 py-4 bg-[#005FB7] text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-[#004A8F] transition-all active:scale-95 cursor-pointer">
                Process Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}