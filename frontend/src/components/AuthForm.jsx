import React, { useState, useEffect } from 'react';

const BUSINESS_TYPES = [
  "Restaurant",
  "Canteen",
  "Mess",
  "Cloud Kitchen",
  "Bakery",
  "Catering Service",
  "Other"
];

// ── InputField defined OUTSIDE AuthForm ──────────────────────────────
// This is critical: defining it inside AuthForm causes React to treat it
// as a new component on every render, unmounting/remounting the <input>
// and losing focus after every keystroke.
const InputField = ({ label, name, type = "text", placeholder, value, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="font-heading font-bold text-xl uppercase tracking-tight">{label}</label>
    <input
      type={type}
      name={name}
      required
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="p-4 border-4 border-black font-sans font-medium text-lg outline-none focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-shadow text-black"
    />
  </div>
);

// ── AuthForm ──────────────────────────────────────────────────────────
const AuthForm = ({ type, onSubmit, loading, error, prefillEmail = '' }) => {
  const [formData, setFormData] = useState({
    email: prefillEmail,
    password: '',
    full_name: '',
    business_name: '',
    business_type: '',
    location: ''
  });

  // Sync prefillEmail into formData when it arrives (e.g. from Google redirect)
  useEffect(() => {
    if (prefillEmail) {
      setFormData((prev) => ({ ...prev, email: prefillEmail }));
    }
  }, [prefillEmail]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      <div className="flex flex-col gap-6 max-h-[50vh] overflow-y-auto px-1 pb-4 pr-3 custom-scrollbar">
        {error && (
          <div className="bg-[#FCA5A5] border-4 border-black p-3 font-sans font-bold text-black shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            {error}
          </div>
        )}

        {type === 'signup' && (
          <>
            <InputField
              label="Full Name"
              name="full_name"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={handleChange}
            />
            <InputField
              label="Business Name"
              name="business_name"
              placeholder="John's Canteen"
              value={formData.business_name}
              onChange={handleChange}
            />

            <div className="flex flex-col gap-2">
              <label className="font-heading font-bold text-xl uppercase tracking-tight">Business Type</label>
              <div className="relative">
                <select
                  name="business_type"
                  required
                  value={formData.business_type}
                  onChange={handleChange}
                  className="w-full p-4 border-4 border-black font-sans font-medium text-lg outline-none focus:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-shadow text-black appearance-none bg-white cursor-pointer"
                >
                  <option value="" disabled>Select a business type</option>
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-black">
                  <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            <InputField
              label="Location"
              name="location"
              placeholder="City, Country"
              value={formData.location}
              onChange={handleChange}
            />
          </>
        )}

        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={handleChange}
        />
        <InputField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 font-heading font-bold text-xl md:text-2xl uppercase border-4 border-black bg-[#93C5FD] py-4 shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] transition-all duration-200 active:translate-y-2 active:translate-x-2 active:shadow-none disabled:opacity-50 disabled:pointer-events-none text-black w-full"
      >
        {loading ? 'Processing...' : (type === 'login' ? 'Login' : 'Sign Up')}
      </button>

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #000;
          border: 2px solid #fff;
        }
      `}</style>
    </form>
  );
};

export default AuthForm;
