"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Phone,
  User,
  Calendar,
  CreditCard,
  DollarSign,
  CheckCircle2,
  Truck,
  Package,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Video,
  Image as ImageIcon,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackingStep {
  step: string;
  timestamp: string;
}

interface TrackingItem {
  product_id: string;
  name: string;
  quantity: number;
  selling_price: number;
}

interface TrackingData {
  order_number: string;
  pnref?: string;
  status: string;
  status_display: string;
  order_date?: string;
  delivery_date?: string;
  shipped_date?: string | null;
  amount?:
    | {
        value: string;
        currency: string;
      }
    | string;
  payment_method?: string;
  comments?: string | null;
  recipient?: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  greeting_message?: string | null;
  special_instructions?: string | null;
  progress?: TrackingStep[];
  live_tracking_available?: boolean;
  has_delivery_video?: boolean;
  has_delivery_photo?: boolean;
  items?: TrackingItem[];
}

export function OrderTrackingCard({ data }: { data: TrackingData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = data.status?.toLowerCase() || "";

  // Format amount
  let formattedAmount = "";
  if (data.amount) {
    if (typeof data.amount === "object") {
      formattedAmount = `${data.amount.currency} ${parseFloat(data.amount.value).toLocaleString()}`;
    } else {
      formattedAmount = `LKR ${parseFloat(data.amount).toLocaleString()}`;
    }
  }

  // Get status color classes
  const getStatusConfig = (statusStr: string) => {
    switch (statusStr) {
      case "delivered":
        return {
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: CheckCircle2,
          color: "emerald",
        };
      case "cancelled":
        return {
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          icon: XCircle,
          color: "rose",
        };
      case "out-for-delivery":
      case "out_for_delivery":
      case "shipped":
        return {
          bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
          icon: Truck,
          color: "sky",
        };
      case "confirmed":
      case "preparing":
        return {
          bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
          icon: Package,
          color: "violet",
        };
      default:
        return {
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          icon: Clock,
          color: "amber",
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  const cleanPhone = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/<br\s*\/?>/gi, "").trim();
  };

  return (
    <div className="group border-foreground/6 bg-background/90 hover:border-foreground/10 relative w-full overflow-hidden rounded-[1.75rem] border bg-violet-600/[0.03] p-6 shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-lg dark:bg-violet-500/[0.03] dark:bg-zinc-950/90">
      {/* Background soft gradient decoration */}
      <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-violet-500/5 blur-3xl transition-all duration-500 group-hover:bg-violet-500/10" />

      {/* Header */}
      <div className="border-foreground/6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-foreground/45 text-[10px] font-bold tracking-wider uppercase">
            Order tracking
          </span>
          <h3 className="text-foreground mt-0.5 text-lg font-bold tracking-tight">
            {data.order_number}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.live_tracking_available && (
            <button className="flex cursor-pointer items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 shadow-sm transition-all duration-200 hover:bg-sky-500/20 dark:text-sky-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
              </span>
              <Compass className="h-3.5 w-3.5" />
              Live Track
            </button>
          )}
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-xs",
              statusConfig.bg
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {data.status_display}
          </span>
        </div>
      </div>

      {/* Key Details Grid */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col">
          <span className="text-foreground/40 text-[10px] font-semibold tracking-wider uppercase">
            Estimated Delivery
          </span>
          <span className="text-foreground mt-1 flex items-center gap-1.5 text-sm font-semibold">
            <Calendar className="text-foreground/40 h-3.5 w-3.5" />
            {data.delivery_date || "Pending"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-foreground/40 text-[10px] font-semibold tracking-wider uppercase">
            Amount
          </span>
          <span className="text-foreground mt-1 flex items-center gap-1.5 text-sm font-bold">
            <DollarSign className="text-foreground/40 h-3.5 w-3.5" />
            {formattedAmount || "N/A"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-foreground/40 text-[10px] font-semibold tracking-wider uppercase">
            Order Date
          </span>
          <span className="text-foreground mt-1 flex items-center gap-1.5 truncate text-sm font-semibold">
            <Clock className="text-foreground/40 h-3.5 w-3.5" />
            {data.order_date
              ? new Date(data.order_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "N/A"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-foreground/40 text-[10px] font-semibold tracking-wider uppercase">
            Recipient
          </span>
          <span className="text-foreground mt-1 flex items-center gap-1.5 truncate text-sm font-semibold">
            <User className="text-foreground/40 h-3.5 w-3.5" />
            {data.recipient?.name || "N/A"}
          </span>
        </div>
      </div>

      {/* Vertical Stepper / Progress Timeline */}
      {data.progress && data.progress.length > 0 && (
        <div className="mt-6 border-t border-zinc-200/50 pt-5 dark:border-zinc-800/50">
          <h4 className="text-foreground/50 mb-4 text-xs font-bold tracking-wider uppercase">
            Delivery Timeline
          </h4>
          <div className="relative space-y-5 pl-6">
            {/* Connecting Line */}
            <div className="absolute top-2 bottom-2 left-[9px] w-0.5 bg-zinc-200 dark:bg-zinc-800" />

            {data.progress.map((item, index) => {
              const isLast = index === data.progress!.length - 1;
              return (
                <div
                  key={index}
                  className="group/item relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  {/* Timeline Node dot */}
                  <div
                    className={cn(
                      "absolute top-1.5 -left-[23px] h-3 w-3 rounded-full border bg-white transition-all duration-300 dark:bg-zinc-900",
                      isLast
                        ? "scale-125 border-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                        : "border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                    )}
                  >
                    {isLast && (
                      <span className="absolute inset-0.5 animate-pulse rounded-full bg-violet-500" />
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-xs leading-relaxed transition-colors duration-200",
                      isLast
                        ? "text-foreground font-bold"
                        : "text-foreground/75 font-medium"
                    )}
                  >
                    {item.step}
                  </span>

                  <span className="text-foreground/40 text-[10px] font-medium sm:text-right">
                    {item.timestamp}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expand / Collapse Button */}
      <div className="border-foreground/6 mt-5 flex justify-center border-t pt-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-violet-600 transition-colors duration-200 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          {isExpanded ? (
            <>
              Show Less <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show More Details <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Expanded Delivery details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 grid grid-cols-1 gap-5 border-t border-zinc-200/50 pt-4 md:grid-cols-2 dark:border-zinc-800/50">
              {/* Recipient details */}
              {data.recipient && (
                <div className="bg-foreground/[0.02] flex flex-col gap-3 rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800/50">
                  <h5 className="text-foreground/50 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                    <MapPin className="text-foreground/40 h-3.5 w-3.5" />
                    Delivery Destination
                  </h5>
                  <div className="text-foreground/80 space-y-2.5 text-xs">
                    <p className="text-foreground font-semibold">
                      {data.recipient.name}
                    </p>
                    <p className="flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="text-foreground/40 mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {data.recipient.address}, {data.recipient.city}
                      </span>
                    </p>
                    {data.recipient.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="text-foreground/40 h-3.5 w-3.5" />
                        <span>{cleanPhone(data.recipient.phone)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Info & Media */}
              <div className="flex flex-col gap-4">
                {/* Meta details */}
                <div className="bg-foreground/[0.02] text-foreground/80 flex flex-col gap-2.5 rounded-2xl border border-zinc-100 p-4 text-xs dark:border-zinc-800/50">
                  <h5 className="text-foreground/50 mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                    <CreditCard className="text-foreground/40 h-3.5 w-3.5" />
                    Payment & Extras
                  </h5>
                  {data.payment_method && (
                    <div className="flex justify-between">
                      <span className="text-foreground/40">Method</span>
                      <span className="text-foreground font-medium">
                        {data.payment_method}
                      </span>
                    </div>
                  )}
                  {data.pnref && (
                    <div className="flex justify-between">
                      <span className="text-foreground/40">Reference</span>
                      <span className="text-foreground font-medium">
                        {data.pnref}
                      </span>
                    </div>
                  )}
                  {data.greeting_message &&
                    data.greeting_message !== "NO PERSONAL MESSAGE" && (
                      <div className="mt-1 flex flex-col gap-1 border-t border-zinc-200/30 pt-2 dark:border-zinc-800/30">
                        <span className="text-foreground/40">
                          Greeting Card
                        </span>
                        <p className="text-foreground/90 mt-0.5 rounded-lg bg-white/40 p-2 font-medium italic dark:bg-zinc-800/40">
                          &ldquo;{data.greeting_message}&rdquo;
                        </p>
                      </div>
                    )}
                  {data.special_instructions && (
                    <div className="flex flex-col gap-1 border-t border-zinc-200/30 pt-2 dark:border-zinc-800/30">
                      <span className="text-foreground/40">Instructions</span>
                      <p className="text-foreground/90 mt-0.5 rounded-lg bg-white/40 p-2 dark:bg-zinc-800/40">
                        {data.special_instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Photo / Video attachments */}
                {(data.has_delivery_photo || data.has_delivery_video) && (
                  <div className="flex gap-2">
                    {data.has_delivery_photo && (
                      <button className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors duration-200 hover:bg-violet-500">
                        <ImageIcon className="h-4 w-4" />
                        Delivery Photo
                      </button>
                    )}
                    {data.has_delivery_video && (
                      <button className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/10 py-2.5 text-xs font-semibold text-violet-600 shadow-xs transition-colors duration-200 hover:bg-violet-500/20 dark:text-violet-400">
                        <Video className="h-4 w-4" />
                        Delivery Video
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Items ordered */}
            {data.items && data.items.length > 0 && (
              <div className="bg-foreground/[0.02] mt-4 flex flex-col gap-3 rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800/50">
                <h5 className="text-foreground/50 flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                  <Package className="text-foreground/40 h-3.5 w-3.5" />
                  Items in this Shipment
                </h5>
                <div className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                  {data.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between py-2 text-xs first:pt-0 last:pb-0"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-foreground font-semibold">
                          {item.name}
                        </span>
                        <span className="text-foreground/45 text-[10px]">
                          ID: {item.product_id} · Qty: {item.quantity}
                        </span>
                      </div>
                      <span className="text-foreground self-start font-semibold">
                        LKR{" "}
                        {(item.selling_price * item.quantity).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
