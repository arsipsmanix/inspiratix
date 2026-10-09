const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwDXXXAPlqzfXufgN8OLCArfPLcezGPKLHYqpHZIi1e-qA8LTSzD2dDwm5OEY4PalARHw/exec";

let base64Foto = "";
let allDataPertemuan = [];

window.onload = function() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  
  const inputTanggal = document.getElementById("inputTanggal");
  if (inputTanggal && !inputTanggal.value) {
    inputTanggal.value = `${yyyy}-${mm}`;
    // Set default bulan cetak admin ke bulan ini
    document.getElementById("filterBulanAdmin").value = `${yyyy}-${mm}`;
  }

  const savedMgmp = localStorage.getItem("kombel_mgmp");
  const savedTanggal = localStorage.getItem("kombel_tanggal");

  if (savedMgmp && savedTanggal) {
    document.getElementById("selectMgmp").value = savedMgmp;
    document.getElementById("inputTanggal").value = savedTanggal;
    masukKeJurnal(false);
  }
};

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

function renderTableAdmin() {
  const bulan = document.getElementById("filterBulanAdmin").value; // Format: YYYY-MM
  const mgmp = document.getElementById("filterMgmpAdmin").value;
  const tbody = document.getElementById("tbodyAdmin");

  let filtered = allDataPertemuan.filter(item => {
    let matchBulan = true;
    let matchMgmp = true;

    if (bulan && item.tanggal) {
      matchBulan = item.tanggal.startsWith(bulan);
    }
    if (mgmp) {
      matchMgmp = item.mgmp === mgmp;
    }
    return matchBulan && matchMgmp;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Tidak ada data kegiatan pada periode ini.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => `
    <tr class="border-b border-slate-100 hover:bg-slate-50 text-sm">
      <td class="p-3 text-center">${idx + 1}</td>
      <td class="p-3 font-semibold">${item.tanggal}</td>
      <td class="p-3"><span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">${item.mgmp}</span></td>
      <td class="p-3">${item.topik || "-"}</td>
      <td class="p-3 text-center">${item.foto_url ? '📸 Ada' : '❌ -'}</td>
    </tr>
  `).join("");
}

// Fungsi Cetak Bulanan (Membuat Dokumen Resmi Siap Print/PDF)
function cetakLaporanBulanan() {
  const bulan = document.getElementById("filterBulanAdmin").value;
  const mgmp = document.getElementById("filterMgmpAdmin").value;

  let filtered = allDataPertemuan.filter(item => {
    let matchBulan = bulan ? item.tanggal.startsWith(bulan) : true;
    let matchMgmp = mgmp ? item.mgmp === mgmp : true;
    return matchBulan && matchMgmp;
  });

  if (filtered.length === 0) {
    alert("Tidak ada data yang tersedia untuk dicetak pada bulan/filter ini!");
    return;
  }

  const printArea = document.getElementById("printArea");
  
  // Format Nama Bulan
  let namaBulanStr = bulan;
  if(bulan) {
    const [dThn, dBln] = bulan.split("-");
    const optBln = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    namaBulanStr = `${optBln[parseInt(dBln)-1]} ${dThn}`;
  }

  let htmlCetak = `
    <!-- KOP SURAT RESMI -->
    <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px;">
      <h3 style="margin: 0; font-size: 14pt; text-transform: uppercase; font-weight: bold;">PEMERINTAH PROVINSI JAWA TIMUR</h3>
      <h3 style="margin: 0; font-size: 14pt; text-transform: uppercase; font-weight: bold;">DINAS PENDIDIKAN</h3>
      <h2 style="margin: 4px 0; font-size: 16pt; text-transform: uppercase; font-weight: bold;">SMA NEGERI 9 SURABAYA</h2>
      <p style="margin: 0; font-size: 9pt;">Jl. Wijaya Kusuma No. 48, Surabaya, Jawa Timur | Telp: (031) 5342128</p>
    </div>

    <div style="text-align: center; margin-bottom: 20px;">
      <h3 style="margin: 0; font-size: 12pt; font-weight: bold; text-decoration: underline; text-transform: uppercase;">LAPORAN BULANAN PERTEMUAN KOMBEL INSPIRATIX</h3>
      <p style="margin: 4px 0 0 0; font-size: 10pt;">Periode: ${namaBulanStr} ${mgmp ? '| MGMP: ' + mgmp : ''}</p>
    </div>
  `;

  filtered.forEach((item, index) => {
    htmlCetak += `
      <div style="margin-bottom: 25px; page-break-inside: avoid; border: 1px solid #ccc; padding: 12px; border-radius: 6px;">
        <h4 style="margin: 0 0 8px 0; font-size: 11pt; background: #f0f0f0; padding: 4px 8px; font-weight: bold;">
          Kegiatan #${index + 1} - MGMP ${item.mgmp} (${item.tanggal})
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; margin-bottom: 8px;">
          <tr><td style="width: 20%; font-weight: bold; padding: 3px 0;">Topik/Materi</td><td>: ${item.topik || '-'}</td></tr>
          <tr><td style="font-weight: bold; padding: 3px 0;">Presensi Guru</td><td>: ${item.presensi_hadir || '-'}</td></tr>
          <tr><td style="font-weight: bold; padding: 3px 0;">Link Dokumen</td><td>: ${item.link_dokumen ? `<a href="${item.link_dokumen}">${item.link_dokumen}</a>` : '-'}</td></tr>
        </table>
        
        <div style="margin-bottom: 6px;">
          <strong>Notulensi Hasil Diskusi:</strong>
          <p style="margin: 2px 0 8px 0; font-size: 9.5pt; white-space: pre-line; background: #fafafa; padding: 6px; border: 1px solid #eee;">${item.notulensi || '-'}</p>
        </div>

        <div style="margin-bottom: 6px;">
          <strong>Rencana Tindak Lanjut (RTL):</strong>
          <p style="margin: 2px 0 8px 0; font-size: 9.5pt; white-space: pre-line; background: #fafafa; padding: 6px; border: 1px solid #eee;">${item.rtl || '-'}</p>
        </div>

        ${item.foto_url ? `
          <div style="text-align: center; margin-top: 8px;">
            <strong style="display: block; text-align: left; font-size: 9pt; mb-1">Dokumentasi Kegiatan:</strong>
            <img src="${item.foto_url}" style="max-height: 180px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
        ` : ''}
      </div>
    `;
  });

  // FORMAT TANDA TANGAN DEFAULT
  htmlCetak += `
    <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 10pt; page-break-inside: avoid;">
      <div style="text-align: center; width: 40%;">
        <p style="margin-bottom: 60px;">Mengetahui,<br>Kepala SMAN 9 Surabaya</p>
        <p style="font-weight: bold; text-decoration: underline; margin: 0;">( Nama Kepala Sekolah )</p>
        <p style="margin: 0;">NIP. ....................................</p>
      </div>
      <div style="text-align: center; width: 40%;">
        <p style="margin-bottom: 60px;">Surabaya, ${new Date().getDate()} ${["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][new Date().getMonth()]} ${new Date().getFullYear()}<br>Ketua Kombel InspiratIX</p>
        <p style="font-weight: bold; text-decoration: underline; margin: 0;">( Nama Ketua Kombel )</p>
        <p style="margin: 0;">NIP. ....................................</p>
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
