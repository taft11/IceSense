import { useNavigate } from 'react-router-dom';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  const handleConfirm = () => {
    navigate('/login', {
      state: {
        signupMode: true,
        termsAccepted: true,
      },
    });
  };

  const handleBack = () => {
    navigate('/login', { state: { signupMode: true } });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-[#4091c9] hover:text-[#4091c9]"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-extrabold text-[#4091c9] text-center">
            Terms and Conditions
          </h1>
          <div className="w-24" />
        </div>

        <div className="space-y-6 text-sm leading-7 text-slate-700">
          <p>
            Welcome to Bella Erin Tube Ice. By accessing or using our website, mobile application,
            or services, you agree to be bound by these Terms and Conditions. If you do not agree
            with any part of these terms, you should not use our services.
          </p>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              We provide ice sales, delivery, and related services in accordance with these terms.
              By placing an order, creating an account, or using our platform, you confirm that you
              are legally capable of entering into a binding agreement.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">
              2. Product Availability and Orders
            </h2>
            <p>
              We reserve the right to accept or decline any order at our discretion. Product
              availability may vary depending on stock, weather conditions, route capacity, and
              operational constraints. Orders must include accurate customer details, delivery
              location, and contact information.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">3. Pricing and Payments</h2>
            <p>
              Prices are subject to change without prior notice. Payment terms may vary depending on
              the order type and service arrangement. All agreed charges must be paid in full before
              or upon delivery, as stated in the order confirmation.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">4. Delivery and Service Scope</h2>
            <p>
              Delivery timing is estimated and may vary due to traffic, weather, road conditions, and
              operational issues. Customers are responsible for ensuring that the delivery site is
              accessible and safe for our staff and vehicles.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">5. Product Use and Handling</h2>
            <p>
              Ice products are perishable and should be handled and stored properly after delivery.
              Customers are responsible for safe storage and proper usage of the products after
              receipt.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">6. Cancellation and Refunds</h2>
            <p>
              subject to approval by
              Bella Erin Tube Ice. Orders that are already in process, prepared, dispatched, or
              delivered are not eligible for cancellation. Approved refunds will be processed
              according to the payment method used and the company&apos;s internal policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">7. Account Responsibilities</h2>
            <p>
              Customers are responsible for keeping account information accurate, maintaining
              confidentiality of login details, and ensuring that all order information submitted is
              correct.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">8. Privacy and Data Protection</h2>
            <p>
              We collect and process customer information for order management, communication, record
              keeping, and service improvement. We handle personal data in accordance with applicable
              privacy laws and our privacy policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">9. Limitation of Liability</h2>
            <p>
              To the maximum extent allowed by law, Bella Erin Tube Ice shall not be liable for any
              damages arising from the use or inability to use our products or services, except where
              caused by our gross negligence or misconduct.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">10. Governing Law</h2>
            <p>
              These Terms and Conditions shall be governed by and interpreted in accordance with the
              laws of the Philippines.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold text-slate-900">11. Changes to Terms</h2>
            <p>
              We may revise these Terms and Conditions from time to time. Continued use of our
              services after changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <p className="pt-4 font-medium text-slate-900">
            For questions or concerns regarding these Terms and Conditions, please contact our support
            team through the channels provided on our website.
          </p>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-full bg-[#4091c9] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#2d75aa]"
            >
              I Agree & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
