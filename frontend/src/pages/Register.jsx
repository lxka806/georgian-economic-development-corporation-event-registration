import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const initialForm = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  businessName: "",
  position: "",
  activity: "",
  otherActivity: "",
  businessDescription: "",
};

const requiredFields = [
  "firstName",
  "lastName",
  "phoneNumber",
  "email",
  "businessName",
  "position",
  "activity",
  "businessDescription",
];
const georgianTextFields = [
  "firstName",
  "lastName",
  "businessName",
  "position",
  "activity",
  "businessDescription",
];
const georgianInputError = "გთხოვთ, ყველა ველი (ელფოსტის გარდა) შეავსოთ ქართულად";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    for (const key of requiredFields) {
      if (!form[key] || !form[key].trim()) {
        setStatus({ type: "error", message: "გთხოვთ, შეავსოთ ყველა სავალდებულო ველი" });
        return;
      }
    }

    if (form.activity === "სხვა" && !form.otherActivity.trim()) {
      setStatus({ type: "error", message: "გთხოვთ, შეავსოთ ყველა სავალდებულო ველი" });
      return;
    }

    const textFieldsToValidate = form.activity === "სხვა"
      ? [...georgianTextFields.filter((key) => key !== "activity"), "otherActivity"]
      : georgianTextFields;
    const hasNonGeorgianText = textFieldsToValidate.some((key) => {
      const value = form[key].trim();
      return (
        !/\p{Script=Georgian}/u.test(value) ||
        !/^[\p{Script=Georgian}\p{White_Space}\p{Punctuation}\p{Number}]+$/u.test(value)
      );
    });
    if (hasNonGeorgianText || /\p{Script=Latin}/u.test(form.phoneNumber)) {
      setStatus({ type: "error", message: georgianInputError });
      return;
    }
    if (!form.phoneNumber.trim().startsWith("5")) {
      setStatus({ type: "error", message: "ტელეფონის ნომერი უნდა იწყებოდეს 5-ით" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          activity: form.activity === "სხვა" ? form.otherActivity.trim() : form.activity,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "რეგისტრაცია ვერ განხორციელდა");

      const email = form.email.trim();
      sessionStorage.setItem("registrationEmail", email);
      navigate(`/sessions?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.message || "სერვერთან დაკავშირება ვერ მოხერხდა. გთხოვთ, სცადოთ თავიდან.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans text-gray-800 w-full">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">    
        {/* HEADER SECTION */}
        <div className="bg-[#1e3632] text-white p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 tracking-wide">
            სამეგრელოს ბიზნესის დღე 2026
          </h1>
          <div className="flex flex-wrap items-center gap-4 md:gap-8 text-sm md:text-base text-gray-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#f0b429]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>25 ნოემბერი · 10:00–15:00</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#f0b429]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>ზვიად გამსახურდიას სახელობის საპრეზიდენტო ცენტრი</span>
            </div>
          </div>
        </div>

        {/* STEPPER SECTION */}
        <div className="flex items-center justify-center py-4 px-6 border-b border-gray-200 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 text-[#122924]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#b33922] text-white">1</span>
            <span className="text-[#b33922]">მონაცემები</span>
          </div>
          <div className="h-px bg-gray-300 w-6 mx-2"></div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-300">2</span>
            <span>პროგრამის არჩევა</span>
          </div>
          <div className="h-px bg-gray-300 w-6 mx-2"></div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-300">3</span>
            <span>ელფოსტის დადასტურება</span>
          </div>
        </div>

        {/* FORM SECTION */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8">
          <p className="text-sm text-gray-500 mb-6">
            ვარსკვლავით (*) აღნიშნული ველების შევსება სავალდებულოა.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

            {/* Row 1 */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">სახელი *</label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-1 focus:ring-[#b33922] focus:border-[#b33922] outline-none transition-colors"
              />
              <p className="text-[11px] text-gray-500 mt-1">მიუთითეთ თქვენი სახელი ქართულად.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">გვარი *</label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-1 focus:ring-[#b33922] focus:border-[#b33922] outline-none transition-colors"
              />
              <p className="text-[11px] text-gray-500 mt-1">მიუთითეთ თქვენი გვარი ქართულად.</p>
            </div>

            {/* Row 2 */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">ტელეფონის ნომერი *</label>
              <input
                type="tel"
                name="phoneNumber"
                value={form.phoneNumber}
                placeholder="5XXXXXXXX"
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-1 focus:ring-[#b33922] focus:border-[#b33922] outline-none transition-colors"
              />
              <p className="text-[11px] text-gray-500 mt-1">მიუთითეთ მობილური ტელეფონის ნომერი, რომელიც იწყება 5-ით.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">ელფოსტა *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-1 focus:ring-[#b33922] focus:border-[#b33922] outline-none transition-colors"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                მიუთითეთ აქტიური ელფოსტის მისამართი, რომელზეც შეძლებთ დამადასტურებელი კოდის მიღებას.
              </p>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">
                კომპანიის / ბიზნესის / ორგანიზაციის დასახელება *
              </label>
              <input
                type="text"
                name="businessName"
                value={form.businessName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-1 focus:ring-[#b33922] focus:border-[#b33922] outline-none transition-colors"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                თუ ინდივიდუალური მეწარმე ხართ, მიუთითეთ თქვენი ბრენდის სახელი ან ფორმატი „ი/მ სახელი გვარი“.
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mt-5.5">
                პოზიცია *
              </label>
              <input
                type="text"
                name="position"
                value={form.position}
                onChange={handleChange}
                placeholder="მაგ. დამფუძნებელი"
                className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-1 focus:ring-[#b33922] focus:border-[#b33922] outline-none transition-colors placeholder-gray-400 mt-"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                მიუთითეთ თქვენი პოზიცია კომპანიაში ან ორგანიზაციაში, მაგალითად, დამფუძნებელი ან დირექტორი.
              </p>
            </div>

            {/* Row 4 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-900 mb-1">საქმიანობის სფერო *</label>
              <div className="relative">
                <select
                  name="activity"
                  value={form.activity}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md p-2.5 text-sm appearance-none focus:ring-1 focus:ring-[#b33922] focus:border-[#b33922] outline-none transition-colors bg-white"
                >
                  <option value="" disabled hidden>აირჩიეთ საქმიანობის სფერო</option>
                  <option value="სოფლის მეურნეობა და აგრობიზნესი">სოფლის მეურნეობა და აგრობიზნესი</option>
                  <option value="წარმოება და გადამუშავება">წარმოება და გადამუშავება</option>
                  <option value="ვაჭრობა">ვაჭრობა</option>
                  <option value="ტურიზმი და მასპინძლობის ინდუსტრია">ტურიზმი და მასპინძლობის ინდუსტრია</option>
                  <option value="მშენებლობა და უძრავი ქონება">მშენებლობა და უძრავი ქონება</option>
                  <option value="ტრანსპორტი და ლოგისტიკა">ტრანსპორტი და ლოგისტიკა</option>
                  <option value="ინფორმაციული ტექნოლოგიები და ციფრული მომსახურებები">ინფორმაციული ტექნოლოგიები და ციფრული მომსახურებები</option>
                  <option value="პროფესიული და საკონსულტაციო მომსახურებები">პროფესიული და საკონსულტაციო მომსახურებები</option>
                  <option value="განათლება და ტრენინგები">განათლება და ტრენინგები</option>
                  <option value="ჯანდაცვა და სილამაზის ინდუსტრია">ჯანდაცვა და სილამაზის ინდუსტრია</option>
                  <option value="კვების ობიექტები და რესტორნები">კვების ობიექტები და რესტორნები</option>
                  <option value="ხელოვნება, დიზაინი და შემოქმედებითი ინდუსტრიები">ხელოვნება, დიზაინი და შემოქმედებითი ინდუსტრიები</option>
                  <option value="სხვა">სხვა</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">აირჩიეთ თქვენი საქმიანობის ძირითადი სფერო.</p>
              {form.activity === "სხვა" && (
                <input
                  type="text"
                  name="otherActivity"
                  value={form.otherActivity}
                  onChange={handleChange}
                  placeholder="მიუთითეთ თქვენი საქმიანობის სფერო"
                  className="mt-3 w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-1 focus:ring-[#b33922] focus:border-[#b33922] outline-none transition-colors"
                />
              )}
            </div>

            {/* Row 5 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-900 mb-1">ბიზნესის მოკლე აღწერა *</label>
              <div className="relative">
                <textarea
                  name="businessDescription"
                  value={form.businessDescription}
                  onChange={handleChange}
                  maxLength={500}
                  rows={4}
                  className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-1 focus:ring-[#b33922] focus:border-[#b33922] outline-none transition-colors resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[11px] text-gray-500">
                    აღწერეთ თქვენი ბიზნესი, ძირითადი პროდუქტი ან მომსახურება და საქმიანობის მიმართულება.
                  </p>
                  <p className="text-[11px] text-gray-500">{form.businessDescription.length} / 500</p>
                </div>
              </div>
            </div>
          </div>

          {status.message && (
            <div className={`mt-6 p-3 rounded-md text-sm border ${status.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
              {status.message}
            </div>
          )}

          {/* Submit Button Area */}
          <div className="mt-8 border-t border-gray-200 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#b33922] hover:bg-[#922d1b] text-white font-medium py-2.5 px-8 rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "იგზავნება..." : "შემდეგი"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}