"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Gift,
  Loader2,
  MapPin,
  ShoppingCart,
  User,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCommerce } from "./commerce-store";
import { getProfile } from "@/lib/profile/actions";
import {
  calculateCartTotal,
  generateCheckoutMessage,
} from "@/lib/commerce/utils";
import { validateCheckout } from "@/lib/commerce/validation";
import type { Address } from "@/types/profile";

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CheckoutDialog({ open, onClose }: CheckoutDialogProps) {
  const { cart } = useCommerce();

  const [isGift, setIsGift] = useState(false);

  // Buyer / sender details (from profile)
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  // Recipient details (only used when isGift)
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // Delivery details
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [locationType, setLocationType] = useState("house");
  const [instructions, setInstructions] = useState("");

  // Gift-specific
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  // Profile saved addresses
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split("T")[0];

  const updateField = <T,>(
    field: string,
    value: T,
    setter: (val: T) => void
  ) => {
    setter(value);
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFieldErrors({});
    setError(null);
    setProfileLoading(true);
    getProfile().then((result) => {
      if (result.ok) {
        const profile = result.profile;
        setBuyerName(profile.name || "");
        setBuyerPhone(profile.phone || "");
        setSavedAddresses(profile.addresses || []);

        const defaultAddr =
          profile.addresses.find((a) => a.is_default) || profile.addresses[0];
        if (defaultAddr) {
          setAddressLine1(defaultAddr.value);
        }
      }
      setProfileLoading(false);
    });
  }, [open]);

  const totalAmount = calculateCartTotal(cart);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const validation = validateCheckout({
      isGift,
      buyerName,
      buyerPhone,
      recipientName,
      recipientPhone,
      addressLine1,
      addressLine2,
      deliveryCity,
      deliveryDate,
      locationType,
      isAnonymous,
      giftMessage,
      instructions,
    });

    if (!validation.ok) {
      setFieldErrors(validation.errors);
      const firstErrorField = Object.keys(validation.errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(`field-${firstErrorField}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    const messageText = generateCheckoutMessage(validation.data);

    window.dispatchEvent(
      new CustomEvent("submit-chat-message", {
        detail: {
          text: messageText,
          isUi: true,
        },
      })
    );

    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="bg-background/95 border-foreground/10 flex max-h-[90vh] flex-col overflow-hidden p-0 shadow-2xl backdrop-blur-lg sm:max-w-md">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4.5 w-4.5 text-violet-500" />
            Secure Checkout
          </DialogTitle>
        </DialogHeader>

        {/* Form Content */}
        {profileLoading ? (
          <div className="text-foreground/45 flex flex-1 flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <span className="text-xs">
              Loading profile and saved addresses...
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex-1 scrollbar-thin space-y-6 overflow-y-auto px-6 py-5"
          >
            {error && (
              <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border px-3 py-2 text-xs">
                {error}
              </div>
            )}

            {/* Order summary */}
            <div className="bg-foreground/3 border-foreground/6 rounded-xl border p-4">
              <h3 className="text-foreground/80 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                Order Summary
              </h3>
              <div className="max-h-24 scrollbar-thin space-y-2 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.product.code}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-foreground/70 max-w-[70%] truncate">
                      {item.product.name}{" "}
                      <span className="text-foreground/40">
                        x{item.quantity}
                      </span>
                    </span>
                    <span className="text-foreground/90 font-medium">
                      {item.product.price || "N/A"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-foreground/6 mt-3 flex justify-between border-t pt-2 text-xs font-semibold">
                <span className="text-foreground/60">Product Total</span>
                <span className="text-foreground/90">
                  Rs. {totalAmount.toLocaleString("en-LK")}
                </span>
              </div>
            </div>

            {/* Gift Toggle */}
            <div className="bg-foreground/3 border-foreground/6 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-violet-500" />
                  <span className="text-foreground/80 text-xs font-semibold">
                    Is this a gift?
                  </span>
                </div>
                <Switch
                  checked={isGift}
                  onCheckedChange={(checked) => {
                    setIsGift(checked);
                    if (!checked) {
                      setRecipientName("");
                      setRecipientPhone("");
                    }
                  }}
                  className="data-[state=checked]:bg-violet-600"
                />
              </div>
              {isGift && (
                <p className="text-foreground/40 mt-2 text-[10px]">
                  We will collect recipient details separately from your own
                  info.
                </p>
              )}
            </div>

            <div className="space-y-6">
              {/* Personal vs Recipient Info */}
              <div className="space-y-4">
                {isGift ? (
                  <>
                    {/* Sender Section */}
                    <h3 className="text-foreground/50 border-foreground/6 flex items-center gap-1.5 border-b pb-1.5 text-[10px] font-bold tracking-wider uppercase">
                      <User className="h-3.5 w-3.5" />
                      Sender (You)
                    </h3>

                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="anonymous"
                        checked={isAnonymous}
                        onChange={(e) =>
                          updateField(
                            "isAnonymous",
                            e.target.checked,
                            setIsAnonymous
                          )
                        }
                        className="border-foreground/10 rounded text-violet-600 focus:ring-violet-500"
                      />
                      <Label
                        htmlFor="anonymous"
                        className="text-foreground/75 text-xs select-none"
                      >
                        Send anonymously
                      </Label>
                    </div>

                    {!isAnonymous && (
                      <div id="field-buyerName" className="space-y-1.5">
                        <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                          Your Name
                        </Label>
                        <Input
                          type="text"
                          value={buyerName}
                          onChange={(e) =>
                            updateField(
                              "buyerName",
                              e.target.value,
                              setBuyerName
                            )
                          }
                          placeholder="Your name (sender)"
                          className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                        />
                        {fieldErrors.buyerName && (
                          <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                            {fieldErrors.buyerName}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Recipient Section */}
                    <h3 className="text-foreground/50 border-foreground/6 flex items-center gap-1.5 border-b pt-2 pb-1.5 text-[10px] font-bold tracking-wider uppercase">
                      <Gift className="h-3.5 w-3.5" />
                      Recipient
                    </h3>

                    <div id="field-recipientName" className="space-y-1.5">
                      <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                        Recipient Name
                      </Label>
                      <Input
                        type="text"
                        value={recipientName}
                        onChange={(e) =>
                          updateField(
                            "recipientName",
                            e.target.value,
                            setRecipientName
                          )
                        }
                        placeholder="Full name of the person receiving"
                        required
                        className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                      />
                      {fieldErrors.recipientName && (
                        <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                          {fieldErrors.recipientName}
                        </span>
                      )}
                    </div>

                    <div id="field-recipientPhone" className="space-y-1.5">
                      <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                        Recipient Phone
                      </Label>
                      <Input
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) =>
                          updateField(
                            "recipientPhone",
                            e.target.value,
                            setRecipientPhone
                          )
                        }
                        placeholder="e.g. 0771234567"
                        required
                        className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                      />
                      {fieldErrors.recipientPhone && (
                        <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                          {fieldErrors.recipientPhone}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Personal Order */}
                    <h3 className="text-foreground/50 border-foreground/6 flex items-center gap-1.5 border-b pb-1.5 text-[10px] font-bold tracking-wider uppercase">
                      <User className="h-3.5 w-3.5" />
                      Your Details
                    </h3>

                    <div id="field-buyerName" className="space-y-1.5">
                      <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                        Name
                      </Label>
                      <Input
                        type="text"
                        value={buyerName}
                        onChange={(e) =>
                          updateField("buyerName", e.target.value, setBuyerName)
                        }
                        placeholder="Your full name"
                        required
                        className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                      />
                      {fieldErrors.buyerName && (
                        <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                          {fieldErrors.buyerName}
                        </span>
                      )}
                    </div>

                    <div id="field-buyerPhone" className="space-y-1.5">
                      <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                        Phone
                      </Label>
                      <Input
                        type="tel"
                        value={buyerPhone}
                        onChange={(e) =>
                          updateField(
                            "buyerPhone",
                            e.target.value,
                            setBuyerPhone
                          )
                        }
                        placeholder="e.g. 0771234567"
                        required
                        className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                      />
                      {fieldErrors.buyerPhone && (
                        <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                          {fieldErrors.buyerPhone}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Delivery Details */}
              <div className="border-foreground/6 space-y-4 border-t pt-5">
                <h3 className="text-foreground/50 border-foreground/6 flex items-center gap-1.5 border-b pb-1.5 text-[10px] font-bold tracking-wider uppercase">
                  <MapPin className="h-3.5 w-3.5" />
                  Delivery Details
                </h3>

                {/* Pre-fill saved addresses */}
                {savedAddresses.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-foreground/50 text-[10px] font-semibold tracking-wider uppercase">
                      Use Saved Address
                    </Label>
                    <select
                      onChange={(e) => {
                        if (e.target.value)
                          updateField(
                            "addressLine1",
                            e.target.value,
                            setAddressLine1
                          );
                      }}
                      className="border-foreground/10 bg-foreground/5 text-foreground/90 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
                    >
                      <option value="">-- Choose profile address --</option>
                      {savedAddresses.map((addr, idx) => (
                        <option key={idx} value={addr.value}>
                          {addr.label}: {addr.value.slice(0, 30)}...
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div id="field-addressLine1" className="space-y-1.5">
                  <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                    Address Line 1
                  </Label>
                  <Input
                    type="text"
                    value={addressLine1}
                    onChange={(e) =>
                      updateField(
                        "addressLine1",
                        e.target.value,
                        setAddressLine1
                      )
                    }
                    placeholder="Street address, P.O. box, company name"
                    required
                    className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                  />
                  {fieldErrors.addressLine1 && (
                    <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                      {fieldErrors.addressLine1}
                    </span>
                  )}
                </div>

                <div id="field-addressLine2" className="space-y-1.5">
                  <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                    Address Line 2
                  </Label>
                  <Input
                    type="text"
                    value={addressLine2}
                    onChange={(e) =>
                      updateField(
                        "addressLine2",
                        e.target.value,
                        setAddressLine2
                      )
                    }
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                  />
                  {fieldErrors.addressLine2 && (
                    <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                      {fieldErrors.addressLine2}
                    </span>
                  )}
                </div>

                <div id="field-deliveryCity" className="space-y-1.5">
                  <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                    Delivery City
                  </Label>
                  <Input
                    type="text"
                    value={deliveryCity}
                    onChange={(e) =>
                      updateField(
                        "deliveryCity",
                        e.target.value,
                        setDeliveryCity
                      )
                    }
                    placeholder="e.g. Colombo 03"
                    required
                    className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                  />
                  {fieldErrors.deliveryCity && (
                    <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                      {fieldErrors.deliveryCity}
                    </span>
                  )}
                </div>

                <div id="field-locationType" className="space-y-1.5">
                  <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                    Location Type
                  </Label>
                  <select
                    value={locationType}
                    onChange={(e) =>
                      updateField(
                        "locationType",
                        e.target.value,
                        setLocationType
                      )
                    }
                    className="border-foreground/10 bg-foreground/5 text-foreground/90 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="office">Office</option>
                    <option value="other">Other</option>
                  </select>
                  {fieldErrors.locationType && (
                    <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                      {fieldErrors.locationType}
                    </span>
                  )}
                </div>

                <div id="field-deliveryDate" className="space-y-1.5">
                  <Label className="text-foreground/60 flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase">
                    <Calendar className="h-3.5 w-3.5" />
                    Delivery Date
                  </Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    min={today}
                    onChange={(e) =>
                      updateField(
                        "deliveryDate",
                        e.target.value,
                        setDeliveryDate
                      )
                    }
                    required
                    className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                  />
                  {fieldErrors.deliveryDate && (
                    <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                      {fieldErrors.deliveryDate}
                    </span>
                  )}
                </div>

                <div id="field-instructions" className="space-y-1.5">
                  <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                    Instructions (Optional)
                  </Label>
                  <Input
                    type="text"
                    value={instructions}
                    onChange={(e) =>
                      updateField(
                        "instructions",
                        e.target.value,
                        setInstructions
                      )
                    }
                    placeholder="Leave at gate, call receiver, etc."
                    className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 focus:border-foreground/20 w-full"
                  />
                  {fieldErrors.instructions && (
                    <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                      {fieldErrors.instructions}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Gift Message (only when gift) */}
            {isGift && (
              <div
                id="field-giftMessage"
                className="border-foreground/6 space-y-1.5 border-t pt-4"
              >
                <Label className="text-foreground/60 text-[10px] font-semibold tracking-wider uppercase">
                  Gift Message (Optional)
                </Label>
                <Textarea
                  value={giftMessage}
                  onChange={(e) =>
                    updateField("giftMessage", e.target.value, setGiftMessage)
                  }
                  placeholder="Write a message to include with the gift (up to 300 characters)..."
                  maxLength={300}
                  rows={2}
                  className="border-foreground/10 bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 w-full"
                />
                {fieldErrors.giftMessage && (
                  <span className="text-destructive mt-0.5 block text-[10px] font-medium">
                    {fieldErrors.giftMessage}
                  </span>
                )}
              </div>
            )}
          </form>
        )}

        {/* Footer */}
        <div className="px-6 pt-4 pb-6">
          <p className="text-foreground/45 mb-3 text-center text-[10px] leading-relaxed">
            * Note: This will generate a checkout payment link you can pay from.
            Delivery charges will be added to this amount.
          </p>

          <div className="flex w-full">
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={profileLoading || cart.length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full cursor-pointer rounded-full bg-violet-600 py-3 text-center text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500"
            >
              Buy (Rs. {totalAmount.toLocaleString("en-LK")})
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
