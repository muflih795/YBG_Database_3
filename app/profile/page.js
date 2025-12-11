"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import BottomNavigation from "../components/bottomnav";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
const supabase = supabaseBrowser;


const DEFAULT_PROFILE = {
  nama: "",
  phone: "",
  email: "",
  gender: "",
  birth: "",
};

export default function ProfilePage() {
  const [form, setForm] = useState(DEFAULT_PROFILE);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [userId, setUserId] = useState(null);

  // 🔹 Load data user dari Supabase
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        setUserId(null);
        setForm(DEFAULT_PROFILE);
        return;
      }

      const u = data.user;
      setUserId(u.id);

      const nama =
        u.user_metadata?.full_name ||
        u.user_metadata?.name ||
        "";
      const phone = u.user_metadata?.phone || "";
      const gender = u.user_metadata?.gender || "";
      const birth = u.user_metadata?.birth || "";
      const email = u.email || "";

      setForm({ nama, phone, gender, birth, email });
    })();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function onGenderChange(val) {
    setForm((f) => ({ ...f, gender: val }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    try {
      const updates = {
        data: {
          full_name: form.nama || null,
          phone: form.phone || null,
          gender: form.gender || null,
          birth: form.birth || null,
        },
      };

      if (form.email) updates.email = form.email;
      if (password) updates.password = password;

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      setPassword("");
      setMsg("Perubahan berhasil disimpan ✅");
    } catch (err) {
      console.error("update profile error:", err);
      setMsg(err?.message || "Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  async function onLogout() {
    try {
      await supabase.auth.signOut();
      setMsg("Kamu sudah logout 👋");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    } catch (e) {
      console.error("logout error:", e);
      setMsg("Gagal logout.");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-100 flex justify-center">
      <main className="w-full min-h-[100dvh] bg-white flex flex-col md:max-w-[430px] md:shadow md:border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white text-[#D6336C] px-4 py-3 font-semibold shadow">
          Profile
        </div>

        {/* Form Profile */}
        <form onSubmit={onSubmit} className="flex-1 pb-24">
          <div className="px-4 mt-3">
            <div className="rounded-xl border border-pink-100 bg-white p-3 flex items-center gap-3 shadow-sm">
              <div className="relative w-12 h-12 overflow-hidden rounded-full bg-pink-50">
                <Image src="/avatar.png" alt="avatar" fill className="object-cover" />
              </div>
              <div className="leading-tight">
                <p className="text-[15px] font-semibold text-black">
                  {form.nama || "Pengguna"}
                </p>
                <p className="text-[12px] text-gray-500">
                  {form.phone || "+62…"}
                </p>
              </div>
            </div>
          </div>

          <SectionTitle title="Edit Profile" />

          <div className="px-4 space-y-3">
            <Input
              label="Nama Lengkap"
              name="nama"
              value={form.nama}
              onChange={onChange}
              placeholder="Nama Lengkap"
            />

            <Input
              type="date"
              label="Tanggal Lahir"
              name="birth"
              value={form.birth}
              onChange={onChange}
            />

            <div>
              <p className="text-[13px] text-black mb-2">Jenis Kelamin</p>
              <div className="flex items-center gap-8">
                <Radio
                  checked={form.gender === "male"}
                  onChange={() => onGenderChange("male")}
                  label="Laki - Laki"
                />
                <Radio
                  checked={form.gender === "female"}
                  onChange={() => onGenderChange("female")}
                  label="Perempuan"
                />
              </div>
            </div>

            <Input
              type="password"
              label="Ubah Password (opsional)"
              placeholder="Isi jika ingin mengubah password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <SectionTitle title="Informasi Kontak" />

          <div className="px-4 space-y-3">
            <Input
              type="tel"
              label="Nomor Telepon"
              placeholder="Masukkan nomor telepon"
              name="phone"
              value={form.phone}
              onChange={onChange}
            />
            <Input
              type="email"
              label="Email"
              placeholder="Masukkan email"
              name="email"
              value={form.email}
              onChange={onChange}
            />
          </div>

          {/*Tombol simpan */}
          <div className="px-4 mt-5 space-y-3">
            {msg && (
              <div className="mb-3 text-[12px] text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-2">
                {msg}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full h-[44px] rounded-lg bg-[#D6336C] text-white font-semibold disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Simpan Perubahan"}
            </button>

            {/*Tombol Logout*/}
            {userId && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full h-[44px] rounded-lg border border-pink-200 text-[#D6336C] font-semibold hover:bg-pink-50 transition"
              >
                Logout
              </button>
            )}
          </div>
        </form>

        <BottomNavigation />
      </main>
    </div>
  );
}


function SectionTitle({ title }) {
  return (
    <div className="px-4 mt-5 mb-3">
      <div className="flex items-center gap-2">
        <div className="h-[10px] w-1.5 rounded bg-[#F8B6C9]" />
        <p className="text-[13px] font-semibold text-black">{title}</p>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-[13px] text-black mb-2">{label}</span>}
      <input
        {...props}
        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-3 text-[14px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
      />
    </label>
  );
}

function Radio({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="radio"
        className="appearance-none w-4 h-4 rounded-full border border-gray-400 checked:border-[#D6336C] checked:bg-[#D6336C]"
        checked={checked}
        onChange={onChange}
      />
      <span className="text-[13px] text-gray-800">{label}</span>
    </label>
  );
}
