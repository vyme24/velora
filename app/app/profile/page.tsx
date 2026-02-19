"use client";

import { type DragEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ImagePlus, Loader2, MapPin, Save, Sparkles, Trash2, Upload } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { Toast } from "@/components/ui/toast";

type MeProfile = {
  name: string;
  email: string;
  username: string;
  dob: string;
  age: number;
  gender: string;
  lookingFor: string;
  bio: string;
  photos: string[];
  interests: string[];
  location: { city: string; state: string; country: string; radiusKm: number };
  preferences: {
    minAge: number;
    maxAge: number;
    gender: string[];
    verifiedOnly: boolean;
    onlineOnly: boolean;
    premiumOnly: boolean;
  };
  isVerified: boolean;
  subscriptionPlan: "free" | "gold" | "platinum";
  coins: number;
};

function toCsv(items: string[]) {
  return items.join(", ");
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const emptyProfile: MeProfile = {
  name: "",
  email: "",
  username: "",
  dob: "",
  age: 18,
  gender: "female",
  lookingFor: "male",
  bio: "",
  photos: ["", "", "", "", "", ""],
  interests: [],
  location: { city: "", state: "", country: "", radiusKm: 50 },
  preferences: {
    minAge: 18,
    maxAge: 40,
    gender: [],
    verifiedOnly: false,
    onlineOnly: false,
    premiumOnly: false
  },
  isVerified: false,
  subscriptionPlan: "free",
  coins: 0
};

async function fileToDataUrl(file: File) {
  const imageBitmap = await createImageBitmap(file);
  const maxWidth = 1280;
  const maxHeight = 1280;
  const ratio = Math.min(maxWidth / imageBitmap.width, maxHeight / imageBitmap.height, 1);
  const width = Math.round(imageBitmap.width * ratio);
  const height = Math.round(imageBitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to process image");
  context.drawImage(imageBitmap, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ProfilePage() {
  const [form, setForm] = useState<MeProfile>(emptyProfile);
  const [interestsCsv, setInterestsCsv] = useState("");
  const [prefGenderCsv, setPrefGenderCsv] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [toast, setToast] = useState("");

  async function loadProfile() {
    setLoading(true);
    const res = await apiFetch("/api/profile/me", { retryOn401: true });
    const json = await res.json();
    if (res.ok) {
      const profile = json.data as MeProfile;
      setForm({
        ...profile,
        photos: [...(profile.photos || []), "", "", "", "", "", ""].slice(0, 6)
      });
      setInterestsCsv(toCsv(profile.interests || []));
      setPrefGenderCsv(toCsv(profile.preferences?.gender || []));
    } else {
      setToast(json.message || "Unable to load profile");
      window.setTimeout(() => setToast(""), 1800);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  const planLabel = useMemo(() => {
    if (form.subscriptionPlan === "platinum") return "Platinum";
    if (form.subscriptionPlan === "gold") return "Gold";
    return "Free";
  }, [form.subscriptionPlan]);

  async function saveProfile() {
    setSaving(true);
    const dob = form.dob.trim();
    const payload = {
      name: form.name,
      username: form.username,
      ...(dob ? { dob } : {}),
      gender: form.gender,
      lookingFor: form.lookingFor,
      bio: form.bio,
      photos: form.photos.filter(Boolean).slice(0, 6),
      interests: parseCsv(interestsCsv),
      location: {
        city: form.location.city,
        state: form.location.state,
        country: form.location.country,
        radiusKm: Number(form.location.radiusKm)
      },
      preferences: {
        minAge: Number(form.preferences.minAge),
        maxAge: Number(form.preferences.maxAge),
        gender: parseCsv(prefGenderCsv),
        verifiedOnly: form.preferences.verifiedOnly,
        onlineOnly: form.preferences.onlineOnly,
        premiumOnly: form.preferences.premiumOnly
      }
    };

    const res = await apiFetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setToast(json.message || "Unable to save profile");
      window.setTimeout(() => setToast(""), 2000);
      return;
    }
    setToast("Profile updated");
    window.setTimeout(() => setToast(""), 1300);
    await loadProfile();
  }

  async function addFiles(inputFiles: File[]) {
    const files = inputFiles.filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;

    const available = 6 - form.photos.filter(Boolean).length;
    if (available <= 0) {
      setToast("Maximum 6 photos allowed");
      window.setTimeout(() => setToast(""), 1600);
      return;
    }

    setUploading(true);
    try {
      const picked = files.slice(0, available);
      const converted = await Promise.all(picked.map((file) => fileToDataUrl(file)));
      setForm((prev) => {
        const merged = [...prev.photos.filter(Boolean), ...converted].slice(0, 6);
        return { ...prev, photos: [...merged, "", "", "", "", "", ""].slice(0, 6) };
      });
      setToast(`${converted.length} photo${converted.length > 1 ? "s" : ""} added`);
      window.setTimeout(() => setToast(""), 1300);
    } catch {
      setToast("Could not process selected image");
      window.setTimeout(() => setToast(""), 1800);
    } finally {
      setUploading(false);
    }
  }

  function onDropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (event.dataTransfer.files?.length) {
      void addFiles(Array.from(event.dataTransfer.files));
    }
  }

  function removePhoto(index: number) {
    setForm((prev) => {
      const next = prev.photos.filter(Boolean).filter((_, i) => i !== index);
      return { ...prev, photos: [...next, "", "", "", "", "", ""].slice(0, 6) };
    });
  }

  function addPhotoByUrl() {
    const trimmed = photoUrl.trim();
    if (!trimmed) return;
    setForm((prev) => {
      const next = [...prev.photos.filter(Boolean), trimmed].slice(0, 6);
      return { ...prev, photos: [...next, "", "", "", "", "", ""].slice(0, 6) };
    });
    setPhotoUrl("");
  }

  if (loading) {
    return (
      <main className="space-y-4">
        <div className="h-20 animate-pulse rounded-3xl bg-muted" />
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-2xl font-semibold">
              <Sparkles className="h-5 w-5 text-primary" /> Edit Profile
            </p>
            <p className="mt-1 text-sm text-foreground/70">Update your details, preferences, and photos in one place.</p>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-2 text-sm">
            <p>Plan: <span className="font-semibold">{planLabel}</span></p>
            <p>Coins: <span className="font-semibold">{form.coins}</span></p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-lg font-semibold">
            <ImagePlus className="h-5 w-5 text-primary" /> Photos
          </p>
          <p className="text-xs text-foreground/65">{form.photos.filter(Boolean).length}/6 added</p>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDropFiles}
          className={`mt-3 rounded-2xl border-2 border-dashed p-4 text-center transition ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
          }`}
        >
          <Upload className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-sm font-semibold">Drag & drop photos here</p>
          <p className="text-xs text-foreground/65">JPG/PNG/WEBP supported. We optimize images before save.</p>

          <label className="mx-auto mt-3 inline-flex h-10 cursor-pointer items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">
            {uploading ? "Uploading..." : "Choose photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                if (files.length) void addFiles(files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          <div className="flex-1">
            <label htmlFor="photoUrl" className="mb-1 block text-xs font-medium text-foreground/75">
              Photo URL
            </label>
            <input
              id="photoUrl"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              placeholder="Or paste image URL"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
            />
          </div>
          <button onClick={addPhotoByUrl} className="h-10 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-muted">
            Add URL
          </button>
        </div>

        {form.photos.filter(Boolean).length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.photos
              .filter(Boolean)
              .map((photo, index) => (
                <div key={`${photo}-${index}`} className="overflow-hidden rounded-2xl border border-border bg-background">
                  <div className="relative aspect-[4/5]">
                    <Image src={photo} alt={`Profile ${index + 1}`} fill className="object-cover" />
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => removePhoto(index)}
                      className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-foreground/65">No photos added yet.</p>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-border bg-card p-5">
          <p className="text-lg font-semibold">Basic info</p>
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="name" className="mb-1 block text-xs font-medium text-foreground/75">Name</label>
              <input id="name" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-medium text-foreground/75">Email</label>
              <input id="email" className="h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground/60" value={form.email} readOnly />
            </div>
            <div>
              <label htmlFor="username" className="mb-1 block text-xs font-medium text-foreground/75">Username</label>
              <input id="username" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Username" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="dob" className="mb-1 block text-xs font-medium text-foreground/75">Date of birth</label>
                <input id="dob" type="date" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" value={form.dob || ""} onChange={(event) => setForm((prev) => ({ ...prev, dob: event.target.value }))} />
              </div>
              <div>
                <label htmlFor="gender" className="mb-1 block text-xs font-medium text-foreground/75">Gender</label>
                <select id="gender" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" value={form.gender} onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="lookingFor" className="mb-1 block text-xs font-medium text-foreground/75">Looking for</label>
                <select id="lookingFor" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" value={form.lookingFor} onChange={(event) => setForm((prev) => ({ ...prev, lookingFor: event.target.value }))}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="bio" className="mb-1 block text-xs font-medium text-foreground/75">Bio</label>
              <textarea id="bio" className="min-h-[120px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" placeholder="Bio" value={form.bio} onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))} />
            </div>
            <div>
              <label htmlFor="interests" className="mb-1 block text-xs font-medium text-foreground/75">Interests</label>
              <input id="interests" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Interests (comma separated)" value={interestsCsv} onChange={(event) => setInterestsCsv(event.target.value)} />
            </div>
            {form.isVerified ? (
              <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500"><CheckCircle2 className="h-4 w-4" /> Verified profile</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-3xl border border-border bg-card p-5">
          <p className="inline-flex items-center gap-2 text-lg font-semibold"><MapPin className="h-4 w-4 text-primary" /> Location & preferences</p>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="city" className="mb-1 block text-xs font-medium text-foreground/75">City</label>
                <input id="city" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="City" value={form.location.city} onChange={(event) => setForm((prev) => ({ ...prev, location: { ...prev.location, city: event.target.value } }))} />
              </div>
              <div>
                <label htmlFor="state" className="mb-1 block text-xs font-medium text-foreground/75">State</label>
                <input id="state" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="State" value={form.location.state} onChange={(event) => setForm((prev) => ({ ...prev, location: { ...prev.location, state: event.target.value } }))} />
              </div>
              <div>
                <label htmlFor="country" className="mb-1 block text-xs font-medium text-foreground/75">Country</label>
                <input id="country" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Country" value={form.location.country} onChange={(event) => setForm((prev) => ({ ...prev, location: { ...prev.location, country: event.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="radiusKm" className="mb-1 block text-xs font-medium text-foreground/75">Search radius (km)</label>
                <input id="radiusKm" type="number" min={1} max={500} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Radius km" value={form.location.radiusKm} onChange={(event) => setForm((prev) => ({ ...prev, location: { ...prev.location, radiusKm: Number(event.target.value || 50) } }))} />
              </div>
              <div>
                <label htmlFor="minAgePref" className="mb-1 block text-xs font-medium text-foreground/75">Min age preference</label>
                <input id="minAgePref" type="number" min={18} max={99} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Min age pref" value={form.preferences.minAge} onChange={(event) => setForm((prev) => ({ ...prev, preferences: { ...prev.preferences, minAge: Number(event.target.value || 18) } }))} />
              </div>
              <div>
                <label htmlFor="maxAgePref" className="mb-1 block text-xs font-medium text-foreground/75">Max age preference</label>
                <input id="maxAgePref" type="number" min={18} max={99} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Max age pref" value={form.preferences.maxAge} onChange={(event) => setForm((prev) => ({ ...prev, preferences: { ...prev.preferences, maxAge: Number(event.target.value || 40) } }))} />
              </div>
            </div>
            <div>
              <label htmlFor="preferredGenders" className="mb-1 block text-xs font-medium text-foreground/75">Preferred genders</label>
              <input id="preferredGenders" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Preferred genders (comma separated)" value={prefGenderCsv} onChange={(event) => setPrefGenderCsv(event.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"><input type="checkbox" checked={form.preferences.verifiedOnly} onChange={(event) => setForm((prev) => ({ ...prev, preferences: { ...prev.preferences, verifiedOnly: event.target.checked } }))} className="h-4 w-4 accent-primary" /> Verified only</label>
              <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"><input type="checkbox" checked={form.preferences.onlineOnly} onChange={(event) => setForm((prev) => ({ ...prev, preferences: { ...prev.preferences, onlineOnly: event.target.checked } }))} className="h-4 w-4 accent-primary" /> Online only</label>
              <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"><input type="checkbox" checked={form.preferences.premiumOnly} onChange={(event) => setForm((prev) => ({ ...prev, preferences: { ...prev.preferences, premiumOnly: event.target.checked } }))} className="h-4 w-4 accent-primary" /> Premium only</label>
            </div>
          </div>
        </article>
      </section>

      <button onClick={saveProfile} disabled={saving} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} {saving ? "Saving..." : "Save profile changes"}
      </button>

      <Toast open={Boolean(toast)} message={toast} />
    </main>
  );
}
