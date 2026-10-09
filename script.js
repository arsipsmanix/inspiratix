// GANTI DENGAN URL WEB APP DEPLOYMENT MILIKMU
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDXXXAPlqzfXufgN8OLCArfPLcezGPKLHYqpHZIi1e-qA8LTSzD2dDwm5OEY4PalARHw/exec";

let base64Foto = "";

// Inisialisasi saat halaman dibuka / direload
window.onload = function() {
  // Set default tanggal hari ini (Format YYYY-MM-DD murni)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const strToday = `${yyyy}-${mm}-${dd}`;

  const inputTanggal = document.getElementById("inputTanggal");
  if (inputTanggal && !inputTanggal.value) {
    inputTanggal.value = strToday;
  }

  // Cek Sesi Tersimpan (Mencegah terlempar ke Homescreen saat ke-reload)
  const savedMgmp = localStorage.getItem("kombel_mgmp");
  const savedTanggal = localStorage.getItem("kombel_tanggal");

  if (savedMgmp && savedTanggal) {
    document.getElementById("selectMgmp").value = savedMgmp;
    document.getElementById("inputTanggal").value = savedTanggal;
    masukKeJurnal(false); // Langsung tampilkan jurnal tanpa reset sesi
  }
};

// Fungsi saat tombol LogIn diklik
async function loginJurnal() {
  const mgmp = document.getElementById("selectMgmp").value;
  const tanggal = document.getElementById("inputTanggal").value;

  if (!mgmp) {
    alert("Silakan pilih MGMP / Mapel terlebih dahulu!");
    return;
  }
  if (!tanggal) {
    alert("Silakan pilih Tanggal Pertemuan terlebih dahulu!");
    return;
  }

  // Simpan Sesi ke localStorage
  localStorage.setItem("kombel_mgmp", mgmp);
  localStorage.setItem("kombel_tanggal", tanggal);

  masukKeJurnal(true);
}

// Menampilkan Halaman Jurnal (4 Panel Grid)
async function masukKeJurnal(isNewLogin = false) {
  const mgmp = localStorage.getItem("kombel_mgmp");
  const tanggal = localStorage.getItem("kombel_tanggal");

  // Update Teks Info di Topbar Jurnal
  document.getElementById("infoMgmpActive").innerText = mgmp;
  document.getElementById("infoTanggalActive").innerText = tanggal;

  // Pindah Tampilan (Hide Homescreen, Show Section Jurnal)
  document.getElementById("sectionHomescreen").classList.add("hidden");
  document.getElementById("sectionJurnal").classList.remove("hidden");

  // Reset & Load Data Guru + Data Pertemuan
  if (isNewLogin) resetForm();
  await fetchGuru(mgmp);
  await tarikDataPertemuan();
}

// Logout / Keluar dari Jurnal (Kembali ke Homescreen)
function keluarJurnal() {
  localStorage.removeItem("kombel_mgmp");
  localStorage.removeItem("kombel_tanggal");

  document.getElementById("sectionJurnal").classList.add("hidden");
  document.getElementById("sectionHomescreen").classList.remove("hidden");
  resetForm();
}

// Ambil Daftar Guru dari Backend Apps Script
async function fetchGuru(mgmp) {
  const container = document.getElementById("containerPresensi");
  container.innerHTML = '<span class="text-slate-400 italic">Memuat data guru...</span>';

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getGuru&mgmp=${encodeURIComponent(mgmp)}`);
    const result = await response.json();

    if (result.status === "success" && result.data.length > 0) {
      container.innerHTML = result.data.map(g => `
        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded transition">
          <input type="checkbox" name="guruHadir" value="${g.nama_guru}" class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500">
          <span class="text-slate-700">${g.nama_guru}</span>
        </label>
      `).join("");
    } else {
      container.innerHTML = '<span class="text-slate-400 italic">Tidak ada data guru terdaftar untuk MGMP ini.</span>';
    }
  } catch (err) {
    container.innerHTML = '<span class="text-red-500 italic">Gagal memuat data guru. Cek koneksi internet.</span>';
  }
}

// Tarik Data Pertemuan berdasarkan MGMP + Tanggal
async function tarikDataPertemuan() {
  const mgmp = localStorage.getItem("kombel_mgmp");
  const tanggal = localStorage.getItem("kombel_tanggal");

  if (!mgmp || !tanggal) return;

  resetFormExceptPresensi();

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getPertemuan&mgmp=${encodeURIComponent(mgmp)}&tanggal=${tanggal}`);
    const result = await response.json();

    if (result.status === "success" && result.found) {
      const d = result.data;
      document.getElementById("inputTopik").value = d.topik || "";
      document.getElementById("inputNotulensi").value = d.notulensi || "";
      document.getElementById("inputRtl").value = d.rtl || "";
      document.getElementById("inputLink").value = d.link_dokumen || "";

      // Checklist Presensi Guru
      if (d.presensi_hadir) {
        const listHadir = d.presensi_hadir.split(",").map(s => s.trim());
        document.querySelectorAll('input[name="guruHadir"]').forEach(cb => {
          cb.checked = listHadir.includes(cb.value);
        });
      }

      // Tampilkan foto jika sudah pernah tersimpan
      if (d.foto_url) {
        const imgPreview = document.getElementById("imgPreview");
        imgPreview.src = d.foto_url;
        imgPreview.classList.remove("hidden");
        document.getElementById("txtFotoEksis").classList.remove("hidden");
      }
    }
  } catch (err) {
    console.error("Gagal menarik data:", err);
  }
}

// Tangkap & Display Preview Foto Live dari Kamera HP
function previewFoto(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      base64Foto = e.target.result;
      const imgPreview = document.getElementById("imgPreview");
      imgPreview.src = base64Foto;
      imgPreview.classList.remove("hidden");
      document.getElementById("txtFotoEksis").classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }
}

// Simpan Jurnal ke Backend Apps Script
async function simpanJurnal() {
  const btnSimpan = document.getElementById("btnSimpan");
  const mgmp = localStorage.getItem("kombel_mgmp");
  const tanggal = localStorage.getItem("kombel_tanggal");

  if (!mgmp || !tanggal) {
    alert("Sesi tidak valid. Silakan kembali ke Homescreen!");
    return;
  }

  // Ambil nama guru yang dicentang
  const presensiHadir = Array.from(document.querySelectorAll('input[name="guruHadir"]:checked'))
    .map(cb => cb.value)
    .join(", ");

  const payload = {
    mgmp: mgmp,
    tanggal: tanggal,
    topik: document.getElementById("inputTopik").value,
    presensi_hadir: presensiHadir,
    notulensi: document.getElementById("inputNotulensi").value,
    rtl: document.getElementById("inputRtl").value,
    link_dokumen: document.getElementById("inputLink").value,
    foto_base64: base64Foto
  };

  btnSimpan.disabled = true;
  btnSimpan.innerHTML = "⏳ Menyimpan Data...";

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.status === "success") {
      alert("✅ " + result.message);
      base64Foto = "";
      tarikDataPertemuan();
    } else {
      alert("❌ Gagal menyimpan: " + result.message);
    }
  } catch (err) {
    alert("❌ Terjadi kesalahan jaringan / server.");
  } finally {
    btnSimpan.disabled = false;
    btnSimpan.innerHTML = "💾 Simpan Jurnal Pertemuan";
  }
}

// Modul Navigasi Panel Admin (Akan dikembangkan lebih lanjut)
function bukaAdmin() {
  alert("Fungsi Panel Admin akan segera kita rancang!");
}

function resetFormExceptPresensi() {
  document.getElementById("inputTopik").value = "";
  document.getElementById("inputNotulensi").value = "";
  document.getElementById("inputRtl").value = "";
  document.getElementById("inputLink").value = "";
  document.getElementById("inputFoto").value = "";
  document.getElementById("imgPreview").classList.add("hidden");
  document.getElementById("txtFotoEksis").classList.add("hidden");
  base64Foto = "";
  document.querySelectorAll('input[name="guruHadir"]').forEach(cb => cb.checked = false);
}

function resetForm() {
  resetFormExceptPresensi();
  document.getElementById("containerPresensi").innerHTML = '<span class="text-slate-400 italic">Memuat data guru...</span>';
}
