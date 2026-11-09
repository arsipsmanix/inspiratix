const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDXXXAPlqzfXufgN8OLCArfPLcezGPKLHYqpHZIi1e-qA8LTSzD2dDwm5OEY4PalARHw/exec";

let base64Foto = "";
let allDataPertemuan = [];

// Tambahkan/perbarui fungsi inisialisasi di script.js:
window.onload = async function() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  
  const inputTanggal = document.getElementById("inputTanggal");
  if (inputTanggal && !inputTanggal.value) {
    inputTanggal.value = `${yyyy}-${mm}-${dd}`;
  }
  const filterBulanAdmin = document.getElementById("filterBulanAdmin");
  if (filterBulanAdmin && !filterBulanAdmin.value) {
    filterBulanAdmin.value = `${yyyy}-${mm}`;
  }

  // Tarik daftar MGMP dari Google Sheet
  await loadMgmpDropdown();

  // Cek Sesi Tersimpan
  const savedMgmp = localStorage.getItem("kombel_mgmp");
  const savedTanggal = localStorage.getItem("kombel_tanggal");

  if (savedMgmp && savedTanggal) {
    document.getElementById("selectMgmp").value = savedMgmp;
    document.getElementById("inputTanggal").value = savedTanggal;
    masukKeJurnal(false);
  }
};

// Fungsi memuat daftar MGMP dinamis dari backend
async function loadMgmpDropdown() {
  const selectMgmp = document.getElementById("selectMgmp");
  const filterMgmpAdmin = document.getElementById("filterMgmpAdmin");

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getMgmpList`);
    const result = await response.json();

    if (result.status === "success" && result.data.length > 0) {
      // Isilkan opsi di Homescreen
      selectMgmp.innerHTML = '<option value="">-- Pilih MGMP --</option>' + 
        result.data.map(m => `<option value="${m}">${m}</option>`).join("");

      // Isikan opsi di Filter Admin
      if (filterMgmpAdmin) {
        filterMgmpAdmin.innerHTML = '<option value="">-- Semua MGMP --</option>' + 
          result.data.map(m => `<option value="${m}">${m}</option>`).join("");
      }
    }
  } catch (err) {
    console.error("Gagal memuat daftar MGMP:", err);
  }
}

async function loginJurnal() {
  const mgmp = document.getElementById("selectMgmp").value;
  const tanggal = document.getElementById("inputTanggal").value;

  if (!mgmp) return alert("Silakan pilih MGMP / Mapel terlebih dahulu!");
  if (!tanggal) return alert("Silakan pilih Tanggal Pertemuan terlebih dahulu!");

  localStorage.setItem("kombel_mgmp", mgmp);
  localStorage.setItem("kombel_tanggal", tanggal);

  masukKeJurnal(true);
}

async function masukKeJurnal(isNewLogin = false) {
  const mgmp = localStorage.getItem("kombel_mgmp");
  const tanggal = localStorage.getItem("kombel_tanggal");

  document.getElementById("infoMgmpActive").innerText = mgmp;
  document.getElementById("infoTanggalActive").innerText = tanggal;

  document.getElementById("sectionHomescreen").classList.add("hidden");
  document.getElementById("sectionAdmin").classList.add("hidden");
  document.getElementById("sectionJurnal").classList.remove("hidden");

  if (isNewLogin) resetForm();
  await fetchGuru(mgmp);
  await tarikDataPertemuan();
}

function keluarJurnal() {
  localStorage.removeItem("kombel_mgmp");
  localStorage.removeItem("kombel_tanggal");

  document.getElementById("sectionJurnal").classList.add("hidden");
  document.getElementById("sectionAdmin").classList.add("hidden");
  document.getElementById("sectionHomescreen").classList.remove("hidden");
  resetForm();
}

async function fetchGuru(mgmp) {
  const container = document.getElementById("containerPresensi");
  container.innerHTML = '<span class="text-slate-400 italic">Memuat data guru...</span>';

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getGuru&mgmp=${encodeURIComponent(mgmp)}`);
    const result = await response.json();

    if (result.status === "success" && result.data.length > 0) {
      container.innerHTML = result.data.map(g => `
        <label class="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1.5 rounded transition">
          <input type="checkbox" name="guruHadir" value="${g.nama_guru}" class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700">${g.nama_guru}</span>
        </label>
      `).join("");
    } else {
      container.innerHTML = '<span class="text-slate-400 italic">Tidak ada data guru terdaftar.</span>';
    }
  } catch (err) {
    container.innerHTML = '<span class="text-red-500 italic">Gagal memuat data guru.</span>';
  }
}

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

      if (d.presensi_hadir) {
        const listHadir = d.presensi_hadir.split(",").map(s => s.trim());
        document.querySelectorAll('input[name="guruHadir"]').forEach(cb => {
          cb.checked = listHadir.includes(cb.value);
        });
      }

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

async function simpanJurnal() {
  const btnSimpan = document.getElementById("btnSimpan");
  const mgmp = localStorage.getItem("kombel_mgmp");
  const tanggal = localStorage.getItem("kombel_tanggal");

  if (!mgmp || !tanggal) return alert("Sesi tidak valid!");

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

// ================= AKSE S & LOGIKA ADMIN =================

function bukaAdmin() {
  const pinInput = prompt("Masukkan PIN Akses Admin:");
  if (pinInput === "admin123") {
    document.getElementById("sectionHomescreen").classList.add("hidden");
    document.getElementById("sectionJurnal").classList.add("hidden");
    document.getElementById("sectionAdmin").classList.remove("hidden");
    loadAdminData();
  } else if (pinInput !== null) {
    alert("❌ PIN Salah! Akses ditolak.");
  }
}

async function loadAdminData() {
  const tbody = document.getElementById("tbodyAdmin");
  tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Memuat data rekap...</td></tr>';

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getAllPertemuan`);
    const result = await response.json();

    if (result.status === "success") {
      allDataPertemuan = result.data;
      renderTableAdmin();
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500">Gagal mengambil data rekap.</td></tr>';
  }
}

// Perbaikan fungsi renderTableAdmin untuk merapikan format Tanggal ISO
function renderTableAdmin() {
  const bulan = document.getElementById("filterBulanAdmin").value;
  const mgmp = document.getElementById("filterMgmpAdmin").value;
  const tbody = document.getElementById("tbodyAdmin");

  let filtered = allDataPertemuan.filter(item => {
    // 1. Format Tanggal Kegiatan (Input Utama)
    let cleanTanggalKegiatan = "";
    if (item.tanggal) {
      let d = new Date(item.tanggal);
      if (!isNaN(d.getTime())) {
        let yyyy = d.getFullYear();
        let mm = String(d.getMonth() + 1).padStart(2, '0');
        let dd = String(d.getDate()).padStart(2, '0');
        cleanTanggalKegiatan = `${yyyy}-${mm}-${dd}`;
      } else {
        cleanTanggalKegiatan = String(item.tanggal).split("T")[0];
      }
    }
    item.tglKegiatanClean = cleanTanggalKegiatan;

    // 2. Format Tanggal & Jam Terakhir Update (WIB)
    let cleanTglUpdate = "-";
    if (item.timestamp) {
      let du = new Date(item.timestamp);
      if (!isNaN(du.getTime())) {
        cleanTglUpdate = du.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).replace('.', ':');
      }
    }
    item.tglUpdateClean = cleanTglUpdate;

    let matchBulan = bulan ? cleanTanggalKegiatan.startsWith(bulan) : true;
    let matchMgmp = mgmp ? item.mgmp === mgmp : true;
    return matchBulan && matchMgmp;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">Tidak ada data kegiatan pada periode ini.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 text-sm">
      <td class="p-3 text-center">${idx + 1}</td>
      <td class="p-3 font-semibold whitespace-nowrap">${item.tglKegiatanClean || item.tanggal}</td>
      <td class="p-3 text-xs text-slate-500 whitespace-nowrap">${item.tglUpdateClean} WIB</td>
      <td class="p-3"><span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">${item.mgmp}</span></td>
      <td class="p-3">${item.topik || "-"}</td>
      <td class="p-3 text-center whitespace-nowrap">
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="lihatDetailPertemuan('${item.id_pertemuan}')" class="bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-2.5 py-1 rounded text-xs border border-blue-200 transition">
            👁️ Intip
          </button>
          <button onclick="cetakLaporanSatuan('${item.id_pertemuan}')" class="bg-purple-50 hover:bg-purple-100 text-purple-600 font-medium px-2.5 py-1 rounded text-xs border border-purple-200 transition">
            🖨️ Cetak
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}
// ================= FUNGSI CETAK LAPORAN BULANAN =================
function cetakLaporanBulanan() {
  const bulan = document.getElementById("filterBulanAdmin").value;
  const mgmp = document.getElementById("filterMgmpAdmin").value;

  let filtered = allDataPertemuan.filter(item => {
    let rawDate = item.tglKegiatanClean || item.tanggal || "";
    let matchBulan = bulan ? rawDate.startsWith(bulan) : true;
    let matchMgmp = mgmp ? item.mgmp === mgmp : true;
    return matchBulan && matchMgmp;
  });

  if (filtered.length === 0) {
    alert("Tidak ada data kegiatan pada periode/filter ini!");
    return;
  }

  const printArea = document.getElementById("printArea");
  
  const today = new Date();
  const optBln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tglTtd = `${today.getDate()} ${optBln[today.getMonth()]} ${today.getFullYear()}`;

  let namaBulanStr = bulan;
  if (bulan) {
    const [dThn, dBln] = bulan.split("-");
    namaBulanStr = `${optBln[parseInt(dBln)-1]} ${dThn}`;
  }

  let htmlCetak = `
    <!-- KOP SURAT RESMI SMAN 9 SURABAYA -->
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 15px;">
      <div style="width: 15%; text-align: left;">
        <img src="logo-jatim.png" style="max-height: 85px; width: auto;">
      </div>
      <div style="width: 70%; text-align: center; font-family: Arial, sans-serif;">
        <h4 style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">PEMERINTAH PROVINSI JAWA TIMUR</h4>
        <h4 style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">DINAS PENDIDIKAN</h4>
        <h3 style="margin: 2px 0; font-size: 13pt; font-weight: bold; text-transform: uppercase;">SEKOLAH MENENGAH ATAS NEGERI 9</h3>
        <h3 style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">KOMUNITAS BELAJAR INSPIRATIX</h3>
        <p style="margin: 2px 0 0 0; font-size: 8.5pt;">Jalan Wijayakusuma Nomor 48, Ketabang, Genteng, Surabaya, Jawa Timur 60272</p>
        <p style="margin: 1px 0 0 0; font-size: 8.5pt;">Telepon (031) 5342608 – Faksimili (031) 5477817</p>
        <p style="margin: 1px 0 0 0; font-size: 8.5pt;">Laman sman9sby.sch.id Pos-el smanixsurabaya@gmail.com</p>
      </div>
      <div style="width: 15%; text-align: right;">
        <img src="logo-kombel.png" style="max-height: 85px; width: auto;">
      </div>
    </div>

    <!-- JUDUL REKAP BULANAN -->
    <div style="text-align: center; margin-bottom: 15px; font-family: Arial, sans-serif;">
      <h3 style="margin: 0; font-size: 11pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">REKAPITULASI LAPORAN BULANAN KOMBEL</h3>
      <p style="margin: 3px 0 0 0; font-size: 9.5pt; font-weight: bold;">Periode: ${namaBulanStr} ${mgmp ? '| MGMP: ' + mgmp : '| Semua MGMP'}</p>
    </div>
  `;

  filtered.forEach((item, index) => {
    htmlCetak += `
      <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-family: Arial, sans-serif; font-size: 9pt;">
        <h4 style="margin: 0 0 6px 0; font-size: 10pt; background: #e2e8f0; padding: 4px 8px; font-weight: bold;">
          Kegiatan #${index + 1} - MGMP ${item.mgmp} (${item.tglKegiatanClean || item.tanggal})
        </h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
          <tr><td style="width: 20%; font-weight: bold; padding: 2px 0;">Topik / Materi</td><td>: ${item.topik || '-'}</td></tr>
          <tr><td style="font-weight: bold; padding: 2px 0;">Presensi Guru</td><td>: ${item.presensi_hadir || '-'}</td></tr>
          ${item.link_dokumen ? `<tr><td style="font-weight: bold; padding: 2px 0;">Link Dokumen</td><td>: <a href="${item.link_dokumen}">${item.link_dokumen}</a></td></tr>` : ''}
        </table>
        
        <div style="margin-bottom: 4px;">
          <strong>Notulensi Hasil Diskusi:</strong>
          <p style="margin: 2px 0 4px 0; white-space: pre-line; background: #fafafa; padding: 4px 6px; border: 1px solid #f1f5f9; border-radius: 4px;">${item.notulensi || '-'}</p>
        </div>

        <div style="margin-bottom: 4px;">
          <strong>Rencana Tindak Lanjut (RTL):</strong>
          <p style="margin: 2px 0 4px 0; white-space: pre-line; background: #fafafa; padding: 4px 6px; border: 1px solid #f1f5f9; border-radius: 4px;">${item.rtl || '-'}</p>
        </div>

        ${item.foto_url ? `
          <div style="text-align: center; margin-top: 6px;">
            <img src="${item.foto_url}" style="max-height: 140px; width: auto; border: 1px solid #cbd5e1; border-radius: 4px;">
          </div>
        ` : ''}
      </div>
    `;
  });

  // FORMAT TANDA TANGAN BULANAN
  htmlCetak += `
    <div style="margin-top: 30px; display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 9.5pt; page-break-inside: avoid;">
      <div style="width: 45%; text-align: center;">
        <p style="margin: 0 0 55px 0;">Mengetahui<br><strong>Kepala SMAN 9 Surabaya</strong></p>
        <div style="display: inline-block; text-align: left;">
          <p style="font-weight: bold; text-decoration: underline; margin: 0;">Tri Kurniawati, M.Pd</p>
          <p style="margin: 2px 0 0 0;">NIP. 197203251997032003</p>
        </div>
      </div>
      <div style="width: 45%; text-align: center;">
        <p style="margin: 0 0 55px 0;">Surabaya, ${tglTtd}<br><strong>Koordinator Kombel ${mgmp || ''}</strong></p>
        <div style="display: inline-block; text-align: left;">
          <p style="font-weight: bold; text-decoration: underline; margin: 0;">____________________</p>
          <p style="margin: 2px 0 0 0;">NIP.</p>
        </div>
      </div>
    </div>
  `;

  printArea.innerHTML = htmlCetak;
  window.print();
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

// FUNGSI 1: Intip / View Detail Pertemuan dalam Modal
function lihatDetailPertemuan(idPertemuan) {
  const data = allDataPertemuan.find(item => item.id_pertemuan === idPertemuan);
  if (!data) return alert("Data tidak ditemukan!");

  document.getElementById("modalDetailMgmp").innerText = "MGMP " + data.mgmp;
  document.getElementById("modalDetailTanggal").innerText = "Pertemuan Tanggal: " + data.tanggal;
  document.getElementById("modalDetailTopik").innerText = data.topik || "-";
  document.getElementById("modalDetailPresensi").innerText = data.presensi_hadir || "Tidak ada daftar hadir terisi.";
  document.getElementById("modalDetailNotulensi").innerText = data.notulensi || "-";
  document.getElementById("modalDetailRtl").innerText = data.rtl || "-";

  // Link Dokumen
  const containerDokumen = document.getElementById("modalContainerDokumen");
  if (data.link_dokumen) {
    document.getElementById("modalDetailLink").href = data.link_dokumen;
    containerDokumen.classList.remove("hidden");
  } else {
    containerDokumen.classList.add("hidden");
  }

  // Foto Dokumentasi
  const containerFoto = document.getElementById("modalContainerFoto");
  if (data.foto_url) {
    containerFoto.innerHTML = `<img src="${data.foto_url}" class="max-h-60 mx-auto rounded-lg shadow border">`;
  } else {
    containerFoto.innerHTML = `<span class="text-slate-400 italic text-xs">Tidak ada foto dokumentasi</span>`;
  }

  // Assign Tombol Cetak dari Modal
  document.getElementById("btnModalCetakSatuan").onclick = function() {
    tutupModalDetail();
    cetakLaporanSatuan(idPertemuan);
  };

  document.getElementById("modalDetailAdmin").classList.remove("hidden");
}

function tutupModalDetail() {
  document.getElementById("modalDetailAdmin").classList.add("hidden");
}

// ================= FUNGSI CETAK LAPORAN SATUAN (FULL CODE) =================
function cetakLaporanSatuan(idPertemuan) {
  const item = allDataPertemuan.find(i => i.id_pertemuan === idPertemuan);
  if (!item) return alert("Data tidak ditemukan!");

  const printArea = document.getElementById("printArea");

  // Format Tanggal Kegiatan ke Teks Indonesia (Digunakan untuk Judul & Tanda Tangan)
  let rawDate = item.tglKegiatanClean || item.tanggal || "";
  let tglKegiatanStr = rawDate;
  let tglTtd = rawDate;

  if (rawDate) {
    let d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const optBln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      tglTtd = `${d.getDate()}${optBln[d.getMonth()]} ${d.getFullYear()}`;  let yyyy = d.getFullYear(); let mm = String(d.getMonth() + 1).padStart(2, '0'); let dd = String(d.getDate()).padStart(2, '0'); tglKegiatanStr = `${yyyy}-${mm}-${dd}`;
    }
  }

  let htmlCetak = `
    <!-- KOP SURAT RESMI SMAN 9 SURABAYA -->
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 15px;">
      <div style="width: 15%; text-align: left;">
        <img src="logo-jatim.png" style="max-height: 85px; width: auto;">
      </div>
      <div style="width: 70%; text-align: center; font-family: Arial, sans-serif;">
        <h4 style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">PEMERINTAH PROVINSI JAWA TIMUR</h4>
        <h4 style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">DINAS PENDIDIKAN</h4>
        <h3 style="margin: 2px 0; font-size: 13pt; font-weight: bold; text-transform: uppercase;">SEKOLAH MENENGAH ATAS NEGERI 9</h3>
        <h3 style="margin: 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">KOMUNITAS BELAJAR INSPIRATIX</h3>
        <p style="margin: 2px 0 0 0; font-size: 8.5pt;">Jalan Wijayakusuma Nomor 48, Ketabang, Genteng, Surabaya, Jawa Timur 60272</p>
        <p style="margin: 1px 0 0 0; font-size: 8.5pt;">Telepon (031) 5342608 – Faksimili (031) 5477817</p>
        <p style="margin: 1px 0 0 0; font-size: 8.5pt;">Laman sman9sby.sch.id Pos-el smanixsurabaya@gmail.com</p>
      </div>
      <div style="width: 15%; text-align: right;">
        <img src="logo-kombel.png" style="max-height: 85px; width: auto;">
      </div>
    </div>

    <!-- JUDUL LAPORAN -->
    <div style="text-align: center; margin-bottom: 15px; font-family: Arial, sans-serif;">
      <h3 style="margin: 0; font-size: 11pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">LAPORAN PERTEMUAN KOMBEL MGMP</h3>
      <p style="margin: 3px 0 0 0; font-size: 9.5pt; font-weight: bold;">MGMP: ${item.mgmp} \vert{} Tanggal Kegiatan:${tglKegiatanStr}</p>
    </div>

    <!-- ISI RINCIAN PERTEMUAN -->
    <div style="font-family: Arial, sans-serif; font-size: 9.5pt; line-height: 1.4;">
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <tr>
          <td style="width: 22%; font-weight: bold; padding: 4px 0; vertical-align: top;">Topik / Materi</td>
          <td style="padding: 4px 0; vertical-align: top;">: <strong>${item.topik || '-'}</strong></td>
        </tr>
        <tr>
          <td style="font-weight: bold; padding: 4px 0; vertical-align: top;">Presensi Guru Hadir</td>
          <td style="padding: 4px 0; vertical-align: top;">: ${item.presensi_hadir || '-'}</td>
        </tr>
        ${item.link_dokumen ? `
        <tr>
          <td style="font-weight: bold; padding: 4px 0; vertical-align: top;">Link Dokumen</td>
          <td style="padding: 4px 0; vertical-align: top;">: <a href="${item.link_dokumen}" target="_blank" style="color: #2563eb; text-decoration: underline;">${item.link_dokumen}</a></td>
        </tr>
        ` : ''}
      </table>

      <div style="margin-bottom: 10px;">
        <strong style="display: block; margin-bottom: 3px; background: #f1f5f9; padding: 3px 6px; border-left: 3px solid #0284c7;">Notulensi Hasil Diskusi:</strong>
        <div style="padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 4px; min-height: 50px; white-space: pre-line; background: #fafafa;">${item.notulensi || '-'}</div>
      </div>

      <div style="margin-bottom: 10px;">
        <strong style="display: block; margin-bottom: 3px; background: #f1f5f9
