import React, { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const API_BASE = "https://game.test-hub.xyz";

type Tier = "common" | "rare" | "epic" | "none";

interface Stats {
  tier: Tier;
  canConvert: boolean;
  rate: number;
  currentPoints: string;
  maxPoints: number;
  minPoints: number;
  maxPreview: string;
  user: { totalTxns: number | string; totalPointsConverted: number | string; totalZkltcReceived: number | string };
  global: { totalPointsConverted: number | string; totalZkltcSent: number | string; totalTxns: number | string };
}

const tierSubtitle: Record<Exclude<Tier, "none">, string> = {
  common: "Common holder • 1 pt = 0.0000769 zkLTC",
  rare: "Rare holder • 1 pt = 0.0000923 zkLTC",
  epic: "Epic holder • 1 pt = 0.0000999 zkLTC",
};

const StatBox = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="px-6 py-5 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md">
    <div className="text-[9px] font-bold text-brand-text-muted uppercase tracking-[0.2em] mb-2">{label}</div>
    <div className="font-bold text-white text-xl tracking-tight break-all">{value}</div>
  </div>
);

export default function PointsConversion() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ pts: number; zkltcSent: string | number; explorerUrl?: string } | null>(null);

  const fetchStats = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/convert/stats/${address}`);
      const data = await r.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) fetchStats();
  }, [isConnected, address, fetchStats]);

  if (!isConnected || !stats) return null;

  const tier = stats.tier;
  const rate = stats.rate;

  const handleConvert = async () => {
    setError(null);
    setSuccess(null);
    const pts = parseInt(input, 10);
    if (!Number.isInteger(pts) || pts < stats.minPoints || pts > stats.maxPoints) {
      setError(`Enter a whole number between ${stats.minPoints} and ${stats.maxPoints}.`);
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/convert/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, points: pts }),
      });
      const data = await r.json();
      if (!r.ok || !data.success) {
        setError(data?.error || data?.message || "Conversion failed.");
      } else {
        setSuccess({ pts, zkltcSent: data.zkltcSent, explorerUrl: data.explorerUrl });
        setInput("");
        fetchStats();
      }
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const ptsNum = parseInt(input, 10);
  const previewPts = Number.isFinite(ptsNum) && ptsNum > 0 ? ptsNum : 0;
  const previewZk = (previewPts * rate).toFixed(8);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-8">
      {tier === "none" ? (
        <p className="text-center text-brand-text-muted text-sm font-medium uppercase tracking-widest">
          Hold an NFT to unlock points conversion
        </p>
      ) : (
        <>
          {stats.canConvert && (
            <div className="bg-brand-surface border border-brand-border rounded-[12px] p-8 bg-black/60 backdrop-blur-3xl relative overflow-hidden">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight italic">Convert Points → zkLTC</h3>
                  <p className="text-[11px] text-brand-text-muted mt-2 font-medium">{tierSubtitle[tier]}</p>
                </div>
                <span className="px-2 py-0.5 bg-white/10 text-white text-[9px] font-bold uppercase tracking-widest rounded border border-white/20">
                  {tier}
                </span>
              </div>

              <div className="space-y-3">
                <input
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={stats.minPoints}
                  max={stats.maxPoints}
                  value={input}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, "");
                    setInput(v);
                    setError(null);
                  }}
                  placeholder={`Enter points (${stats.minPoints}-${stats.maxPoints})`}
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 font-mono"
                />

                <div className="text-[11px] text-brand-text-muted font-mono">
                  {previewPts} pts → {previewZk} zkLTC
                </div>

                <button
                  onClick={handleConvert}
                  disabled={submitting || !input}
                  className="w-full py-3 bg-white text-black font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? "Converting..." : "Convert"}
                </button>

                {success && (
                  <div className="mt-4 p-4 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-white space-y-2">
                    <div>✅ {success.pts} pts converted → {success.zkltcSent} zkLTC sent!</div>
                    {success.explorerUrl && (
                      <a
                        href={success.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest underline decoration-white/30 underline-offset-4 hover:decoration-white"
                      >
                        View on Explorer <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-[0.3em] mb-4">My Conversions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatBox label="My Conversions" value={String(stats.user.totalTxns)} />
              <StatBox label="Points Converted" value={String(stats.user.totalPointsConverted)} />
              <StatBox label="zkLTC Received" value={String(stats.user.totalZkltcReceived)} />
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-brand-text-muted uppercase tracking-[0.3em] mb-4">Global Stats</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatBox label="Total Conversions" value={String(stats.global.totalTxns)} />
              <StatBox label="Points Burned" value={String(stats.global.totalPointsConverted)} />
              <StatBox label="zkLTC Distributed" value={String(stats.global.totalZkltcSent)} />
            </div>
          </div>
        </>
      )}
      {loading && null}
    </motion.div>
  );
}
