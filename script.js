// GANTI DENGAN URL WEB APP DEPLOYMENT MILIKMU
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDXXXAPlqzfXufgN8OLCArfPLcezGPKLHYqpHZIi1e-qA8LTSzD2dDwm5OEY4PalARHw/exec";

let base64Foto = "";

// Set Default Tanggal Hari Ini dalam String YYYY-MM-DD (Mencegah Isu UTC Offset)
window.onload = function() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById("inputTanggal").value = `${yyyy}-${mm}-${dd}`;
};

// Trigger saat MGMP dipilih
async function loadGuruAndData() {
  const mgmp = document.getElementById("selectMgmp").value;
  const mainGrid = document.getElementById("mainGrid");
  const btnSimpan = document.getElementById("btnSimpan");

  if (!mgmp) {
    mainGrid.classList.add("opacity-50", "pointer-events-none");
    btnSimpan.disabled = true;
    btnSimpan.className = "bg-slate-400 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg text-base cursor-not-allowed";
    return;
  }

  mainGrid.classList.remove("opacity-50", "pointer-events-none");
  btnSimpan.disabled = false;
  btnSimpan.className = "bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg text-base transition cursor-pointer";

  // Reset Form & Load Data Guru
  resetForm();
  await fetchGuru(mgmp);
  await tarikDataPertemuan();
}

// Ambil Daftar Guru dari Backend
async function fetchGuru(mgmp) {
  const container = document.getElementById("containerPresensi");
  container.innerHTML = '<span class="text-slate-400 italic">Memuat data guru...</span>';

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getGuru&mgmp=${encodeURIComponent(mgmp)}`);
    const result = await response.json();

    if (result.status === "success" && result.data.length > 0) {
      container.innerHTML = result.data.map(g => `
        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
          <input type="checkbox" name="guruHadir" value="${g.nama_guru}" class="w-4 h-4 text-blue-600 rounded">
          <span>${g.nama_guru}</span>
        </label>
      `).join("");
    } else {
      container.innerHTML = '<span class="text-slate-400 italic">Tidak ada guru terdaftar untuk MGMP ini.</span>';
    }
  } catch (err) {
    container.innerHTML = '<span class="text-red-500 italic">Gagal memuat data guru.</span>';
  }
}

// Tarik Data Pertemuan berdasarkan MGMP + Tanggal
async function tarikDataPertemuan() {
  const mgmp = document.getElementById("selectMgmp").value;
  const tanggal = document.getElementById("inputTanggal").value; // Format string: YYYY-MM-DD

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

      // Tampilkan indikator foto jika foto sudah ada
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

// Convert Foto dari Kamera Live ke Base64
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

// Simpan Jurnal ke Apps Script
async function simpanJurnal() {
  const btnSimpan = document.getElementById("btnSimpan");
  const mgmp = document.getElementById("selectMgmp").value;
  const tanggal = document.getElementById("inputTanggal").value; // String murni YYYY-MM-DD

  if (!mgmp || !tanggal) {
    alert("Pilih MGMP dan Tanggal terlebih dahulu!");
    return;
  }

  // Kumpulkan guru yang dicentang
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
  btnSimpan.innerText = "⏳ Menyimpan Data...";

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
      tarikDataPertemuan(); // Refresh data
    } else {
      alert("❌ Gagal menyimpan: " + result.message);
    }
  } catch (err) {
    alert("❌ Terjadi kesalahan jaringan / server.");
  } finally {
    btnSimpan.disabled = false;
    btnSimpan.innerText = "💾 Simpan Jurnal Pertemuan";
  }
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
  document.getElementById("containerPresensi").innerHTML = '<span class="text-slate-400 italic">Pilih MGMP terlebih dahulu...</span>';
}
