/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  Calendar,
  Users,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GroupData {
  jumlah: number;
  total: number;
}

interface SummaryResult {
  detail: Record<string, Record<string, GroupData>>;
  dailyTotals: Record<string, number>;
  grandTotal: number;
  dates: string[];
}

export default function App() {
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  const processExcel = async (file: File) => {
    try {
      setError(null);
      setFileName(file.name);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error("File Excel kosong.");
      }

      // Check for required columns
      const firstRow = jsonData[0];
      const requiredCols = ["Grup pengguna", "Harga", "Diaktifkan di"];
      const missing = requiredCols.filter(col => !(col in firstRow));
      
      if (missing.length > 0) {
        throw new Error(`Kolom tidak ditemukan: ${missing.join(", ")}`);
      }

      const detail: Record<string, Record<string, GroupData>> = {};
      const dailyTotals: Record<string, number> = {};
      let grandTotal = 0;

      jsonData.forEach((row) => {
        const grup = row["Grup pengguna"];
        const harga = parseInt(row["Harga"]) || 0;
        const rawDate = row["Diaktifkan di"];
        
        let dateStr = "";
        if (typeof rawDate === 'number') {
          // Handle Excel serial date
          const date = new Date((rawDate - 25569) * 86400 * 1000);
          dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
        } else {
          dateStr = String(rawDate).split(' ')[0].replace(/-/g, '/');
        }

        if (!detail[dateStr]) {
          detail[dateStr] = {};
          dailyTotals[dateStr] = 0;
        }

        if (!detail[dateStr][grup]) {
          detail[dateStr][grup] = { jumlah: 0, total: 0 };
        }

        detail[dateStr][grup].jumlah += 1;
        detail[dateStr][grup].total += harga;
        dailyTotals[dateStr] += harga;
        grandTotal += harga;
      });

      const dates = Object.keys(detail).sort((a, b) => a.localeCompare(b));

      setResult({ detail, dailyTotals, grandTotal, dates });
    } catch (err: any) {
      setError(err.message || "Gagal memproses file.");
      setResult(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processExcel(file);
  };

  const copyToClipboard = () => {
    if (!result) return;

    let text = "===== HASIL REKAP =====\n\n";
    result.dates.forEach((date) => {
      text += `Tanggal : ${date}\n`;
      text += "----------------------------------------\n";
      Object.entries(result.detail[date] as Record<string, GroupData>).forEach(([grup, data]) => {
        text += `Grup   : ${grup}\n`;
        text += `Jumlah : ${data.jumlah}\n`;
        text += `Total  : ${formatRupiah(data.total)}\n`;
        text += "----------------------------------------\n";
      });
      text += `TOTAL HARI INI : ${formatRupiah(result.dailyTotals[date])}\n`;
      text += "----------------------------------------\n\n";
    });

    text += "========================================\n";
    text += `GRAND TOTAL SEMUA HARI : ${formatRupiah(result.grandTotal)}\n`;

    navigator.clipboard.writeText(text);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#1e272e] text-white font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#1e272e]/80 backdrop-blur-md border-b border-white/5 p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">REKAP VOUCHER</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">By JUN.AI © 2026</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-32">
        {/* Upload Section */}
        <section className="mb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full group relative overflow-hidden bg-[#2c3e50] border-2 border-dashed border-white/10 hover:border-orange-500/50 rounded-2xl p-8 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-orange-500/10 transition-colors">
                <Upload className="w-7 h-7 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-200">
                  {fileName ? fileName : "Pilih File Excel"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Format: .xlsx (Grup, Harga, Tanggal)</p>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx"
              className="hidden"
            />
          </button>
        </section>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {result.dates.map((date) => (
                <div key={date} className="bg-[#2c3e50] rounded-2xl overflow-hidden shadow-xl border border-white/5">
                  <div className="bg-orange-500/10 p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <span className="font-bold text-orange-500">{date}</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Harian</div>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {Object.entries(result.detail[date] as Record<string, GroupData>).map(([grup, data]) => (
                      <div key={grup} className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-gray-200">{grup}</span>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                            {data.jumlah} Voucher
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-gray-500">Subtotal</span>
                          <span className="text-sm font-bold text-white">{formatRupiah(data.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-emerald-500/10 p-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Total Hari Ini</span>
                    <span className="text-lg font-black text-emerald-500">{formatRupiah(result.dailyTotals[date])}</span>
                  </div>
                </div>
              ))}

              {/* Grand Total Card */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 shadow-2xl shadow-orange-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-5 h-5 text-white/80" />
                  <span className="text-xs font-bold text-white/80 uppercase tracking-widest">Grand Total</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black text-white leading-none">
                    {formatRupiah(result.grandTotal)}
                  </span>
                  <p className="text-white/60 text-[10px] mt-2 uppercase tracking-wider font-bold">Total akumulasi semua hari</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-gray-500"
            >
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-sm">Belum ada data untuk ditampilkan</p>
              <p className="text-[10px] mt-1 uppercase tracking-widest opacity-50">Silakan unggah file Excel</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Action Bar */}
      {result && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1e272e] via-[#1e272e] to-transparent">
          <div className="max-w-md mx-auto">
            <button
              onClick={copyToClipboard}
              className={`w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all duration-300 shadow-xl ${
                isCopying 
                ? 'bg-emerald-500 text-white scale-[0.98]' 
                : 'bg-white text-[#1e272e] hover:bg-gray-100 active:scale-[0.95]'
              }`}
            >
              {isCopying ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>BERHASIL DISALIN</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>COPY HASIL REKAP</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
