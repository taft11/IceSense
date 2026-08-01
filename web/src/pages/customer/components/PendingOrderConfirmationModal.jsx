import { CheckCircle } from 'lucide-react';

export default function PendingOrderConfirmationModal({
  isOpen,
  orderId,
  onViewOrders,
  onBackHome,
  onClose,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#eaf4ff] text-[#205a82] shadow-sm">
            <CheckCircle className="h-8 w-8" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close confirmation dialog"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Order Submitted for Verification</h2>
          <div className="mx-auto mt-4 inline-flex rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">
            Pending Verification
          </div>
          <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
            Your order <span className="font-semibold text-slate-900">#{orderId}</span> has been received and is now pending manual review by an admin.
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            We will review your payment and confirm the order within 24 hours.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onViewOrders}
            className="inline-flex items-center justify-center rounded-2xl bg-[#4091c9] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2d75aa]"
          >
            View My Orders
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
