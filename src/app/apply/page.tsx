"use client";

import { useState, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { QUOTE_SERVICES } from "@/lib/quote-services";
import OwnerDetailsFields from "@/components/OwnerDetailsFields";
const SERVICES = QUOTE_SERVICES.map((s) => s.id);
const HOW_HEARD_OPTIONS = [
  "Customer referral",
  "Social media",
  "Already a Vicrez dealer",
  "Google search",
  "Other",
];

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    business_name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    website: "",
    instagram: "",
    facebook: "",
    services: [] as string[],
    other_service: "",
    years_in_business: "",
    google_business_url: "",
    description: "",
    vehicle_brands: "",
    how_heard: "",
    agreement: false,
    inquiry_consent: false,
    parts_policy: "",
    service_details: "",
    equipment: "",
    hours_note: "",
    honeypot: "", // Hidden field for spam detection
  });

  const requestId = useRef("");
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check required fields
    if (
      !formData.business_name ||
      !formData.city ||
      !formData.state ||
      !formData.zip ||
      !formData.phone ||
      !formData.email ||
      !formData.agreement
    ) {
      setError("Please fill in all required fields and accept the agreement.");
      return;
    }

    // Check social media/website presence
    if (!formData.website && !formData.instagram && !formData.facebook) {
      setError(
        "Please provide at least one form of web presence (website, Instagram, or Facebook).",
      );
      return;
    }

    // Check services
    if (formData.services.length === 0) {
      setError("Please select at least one service you offer.");
      return;
    }

    if (!requestId.current) requestId.current = crypto.randomUUID();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          request_id: requestId.current,
          years_in_business: formData.years_in_business
            ? parseInt(formData.years_in_business)
            : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit application");
      }

      setReceipt(result);
      requestAnimationFrame(() =>
        document.getElementById("application-receipt")?.focus(),
      );
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (service: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        services: [...prev.services, service],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        services: prev.services.filter((s) => s !== service),
      }));
    }
  };

  if (success) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1
                id="application-receipt"
                tabIndex={-1}
                className="text-2xl font-bold text-gray-900 mb-4"
              >
                Application Submitted!
              </h1>
              <p className="text-gray-700 mb-8">
                Thanks for applying to join the Vicrez Installer Network! Our
                team will review your application and contact you using the
                details you provided.
              </p>
              <p className="font-semibold mb-4">
                Reference: {receipt?.application_id}
              </p>
              <p className="mb-6">
                <a
                  className="underline"
                  href={"/request-status#" + receipt?.token}
                >
                  Save your private status link (180 days)
                </a>
              </p>
              <a href="/" className="btn-primary inline-flex items-center">
                Back to Directory
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="mb-4">
              <a className="underline" href="/claim">
                Already listed? Claim or update your shop
              </a>
            </p>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Join the Vicrez Installer Network
            </h1>
            <p className="text-lg text-gray-700">
              Apply to be listed in our directory and connect with customers
              looking for quality installation services.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Business Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label
                    htmlFor="apply-business-name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Business Name *
                  </label>
                  <input
                    id="apply-business-name"
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.business_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        business_name: e.target.value,
                      }))
                    }
                    placeholder="Your business name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="apply-street-address"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Street Address *
                  </label>
                  <input
                    id="apply-street-address"
                    required
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.street}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        street: e.target.value,
                      }))
                    }
                    placeholder="123 Main Street"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apply-city"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    City *
                  </label>
                  <input
                    id="apply-city"
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="Your city"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apply-state"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    State *
                  </label>
                  <input
                    id="apply-state"
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                    placeholder="CA"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apply-zip-code"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    ZIP Code *
                  </label>
                  <input
                    id="apply-zip-code"
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.zip}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, zip: e.target.value }))
                    }
                    placeholder="90210"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apply-phone-number"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Phone Number *
                  </label>
                  <input
                    id="apply-phone-number"
                    type="tel"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apply-email-address"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address *
                  </label>
                  <input
                    id="apply-email-address"
                    type="email"
                    required
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="contact@yourshop.com"
                  />
                </div>
              </div>
            </div>

            {/* Web Presence */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Web Presence
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                At least one is required
              </p>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label
                    htmlFor="apply-website"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Website
                  </label>
                  <input
                    id="apply-website"
                    type="url"
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        website: e.target.value,
                      }))
                    }
                    placeholder="https://yourshop.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apply-instagram"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Instagram
                  </label>
                  <input
                    id="apply-instagram"
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.instagram}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        instagram: e.target.value,
                      }))
                    }
                    placeholder="@yourshop or https://instagram.com/yourshop"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apply-facebook"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Facebook
                  </label>
                  <input
                    id="apply-facebook"
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.facebook}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        facebook: e.target.value,
                      }))
                    }
                    placeholder="https://facebook.com/yourshop"
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Services Offered *
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SERVICES.map((service) => (
                  <label key={service} className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-vicrez-red border-gray-600 bg-white rounded focus:ring-vicrez-red"
                      checked={formData.services.includes(service)}
                      onChange={(e) =>
                        handleServiceChange(service, e.target.checked)
                      }
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {QUOTE_SERVICES.find((s) => s.id === service)?.label}
                    </span>
                  </label>
                ))}
              </div>

              {formData.services.includes("other") && (
                <div className="mt-4">
                  <label
                    htmlFor="apply-other-service-please-specify"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Other Service (please specify)
                  </label>
                  <input
                    id="apply-other-service-please-specify"
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.other_service}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        other_service: e.target.value,
                      }))
                    }
                    placeholder="Describe your other service"
                  />
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Additional Information
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="apply-years-in-business"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Years in Business
                    </label>
                    <input
                      id="apply-years-in-business"
                      type="number"
                      min="0"
                      className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                      value={formData.years_in_business}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          years_in_business: e.target.value,
                        }))
                      }
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="apply-how-did-you-hear-about-vicrez"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      How did you hear about Vicrez?
                    </label>
                    <select
                      id="apply-how-did-you-hear-about-vicrez"
                      className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                      value={formData.how_heard}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          how_heard: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select an option</option>
                      {HOW_HEARD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="apply-google-business-url"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Google Business URL
                  </label>
                  <input
                    id="apply-google-business-url"
                    type="url"
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.google_business_url}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        google_business_url: e.target.value,
                      }))
                    }
                    placeholder="https://maps.google.com/business/yourshop"
                  />
                </div>

                <div>
                  <label
                    htmlFor="apply-description-specialties"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Description / Specialties
                  </label>
                  <textarea
                    id="apply-description-specialties"
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Tell us about your shop, specialties, or any additional information..."
                  />
                </div>

                <div>
                  <label
                    htmlFor="apply-vehicle-brands-you-work-with"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Vehicle Brands You Work With
                  </label>
                  <input
                    id="apply-vehicle-brands-you-work-with"
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent"
                    value={formData.vehicle_brands}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        vehicle_brands: e.target.value,
                      }))
                    }
                    placeholder="BMW, Mercedes, Honda, Toyota, etc."
                  />
                </div>
              </div>
            </div>

            {/* Honeypot field (hidden) */}
            <OwnerDetailsFields
              values={formData}
              onChange={(key, value) =>
                setFormData((v) => ({ ...v, [key]: value }))
              }
            />
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={formData.inquiry_consent}
                onChange={(e) =>
                  setFormData((v) => ({
                    ...v,
                    inquiry_consent: e.target.checked,
                  }))
                }
              />
              <span>
                Optional: I want this shop to receive relevant installation
                inquiries at the business email above, after Vicrez reviews the
                contact details. The email will not be published by this choice.
              </span>
            </label>
            <input
              type="text"
              name="honeypot"
              value={formData.honeypot}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, honeypot: e.target.value }))
              }
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Agreement */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start">
                <input
                  id="apply-agreement"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-vicrez-red border-gray-600 bg-white rounded focus:ring-vicrez-red mt-0.5"
                  checked={formData.agreement}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      agreement: e.target.checked,
                    }))
                  }
                />
                <label
                  htmlFor="apply-agreement"
                  className="ml-3 text-sm text-gray-700"
                >
                  I agree to be listed in the Vicrez Installer Network directory
                  and understand that:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-gray-600">
                    <li>
                      Listing is free and does not guarantee business or
                      endorsement by Vicrez
                    </li>
                    <li>
                      I am responsible for the quality of my work and customer
                      service
                    </li>
                    <li>
                      I can request removal from the directory at any time
                    </li>
                    <li>
                      My reviewed business details may be publicly displayed.
                      Private application and inquiry email permissions are
                      handled separately.
                    </li>
                  </ul>
                </label>
              </div>
            </div>

            {/* Rate Limiting Note */}
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Already listed? Use the claim/update
                workflow to correct your existing listing. If you've already
                submitted an application, save your receipt and use its private
                status link before submitting another application.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <p role="alert" className="text-sm text-red-800">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
