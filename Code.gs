const CFG = {
  BOOKS: 'Buku',
  LOANS: 'Peminjaman',
  SETTINGS: 'Pengaturan',
  DRIVE_FOLDER: 'Sampul Perpustakaan Digital'
};

function doGet() {
  setupSheets();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Perpustakaan Digital')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const defs = [
    [CFG.BOOKS, ['ID Buku','ISBN','Judul','Penulis','Penerbit','Tahun','Kategori','Rak','Stok Total','Stok Tersedia','URL Sampul','Ditambahkan']],
    [CFG.LOANS, ['ID Transaksi','Tanggal Pinjam','Nama Peminjam','Kontak','ISBN','Judul Buku','Jumlah','Jatuh Tempo','Tanggal Kembali','Status','Catatan']],
    [CFG.SETTINGS, ['Pengaturan','Nilai']]
  ];
  defs.forEach(([name, headers]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,headers.length).setBackground('#173f35').setFontColor('#fff').setFontWeight('bold');
    } else if (name === CFG.BOOKS && sh.getLastColumn() < headers.length) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
    }
  });
  const set = ss.getSheetByName(CFG.SETTINGS);
  if (set.getLastRow() < 2) set.getRange(2,1,3,2).setValues([
    ['Nama Perpustakaan','Perpustakaan Digital'],
    ['Maksimal Lama Pinjam (hari)',7],
    ['Kontak Perpustakaan','']
  ]);
  return 'Spreadsheet siap digunakan.';
}

function getDashboard() {
  setupSheets();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const b = ss.getSheetByName(CFG.BOOKS).getDataRange().getValues();
  const l = ss.getSheetByName(CFG.LOANS).getDataRange().getValues();
  const active = l.slice(1).filter(r => String(r[9]) === 'Dipinjam');
  const overdue = active.filter(r => r[7] && new Date(r[7]).setHours(0,0,0,0) < new Date().setHours(0,0,0,0));
  return {
    titles: Math.max(0,b.length-1),
    copies: b.slice(1).reduce((s,r)=>s+(Number(r[8])||0),0),
    available: b.slice(1).reduce((s,r)=>s+(Number(r[9])||0),0),
    borrowed: active.reduce((s,r)=>s+(Number(r[6])||0),0),
    activeLoans: active.length,
    overdue: overdue.length
  };
}

function getBooks(q) {
  setupSheets();
  const rows = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CFG.BOOKS).getDataRange().getValues();
  q = String(q||'').toLowerCase().trim();
  return rows.slice(1).filter(r=>r[0]).filter(r=>!q || r.slice(0,11).join(' ').toLowerCase().includes(q)).map(r=>({
    id:r[0], isbn:r[1], title:r[2], author:r[3], publisher:r[4], year:r[5],
    category:r[6], shelf:r[7], total:Number(r[8])||0, available:Number(r[9])||0,
    cover:r[10]||''
  }));
}

function lookupIsbn(isbn) {
  const clean = String(isbn||'').replace(/[-\s]/g,'');
  if (!/^(97[89])?\d{9}[\dX]$/i.test(clean)) throw new Error('Format ISBN tidak valid.');
  const url = 'https://www.googleapis.com/books/v1/volumes?q=isbn:'+encodeURIComponent(clean);
  const res = UrlFetchApp.fetch(url,{muteHttpExceptions:true});
  if (res.getResponseCode() !== 200) throw new Error('Pencarian ISBN gagal. Coba lagi atau isi manual.');
  const data = JSON.parse(res.getContentText());
  if (!data.items || !data.items.length) throw new Error('Data ISBN tidak ditemukan. Isi informasi buku secara manual.');
  const v = data.items[0].volumeInfo||{};
  return {isbn:clean,title:v.title||'',author:(v.authors||[]).join(', '),publisher:v.publisher||'',
    year:(v.publishedDate||'').slice(0,4),category:(v.categories||[])[0]||'',cover:(v.imageLinks||{}).thumbnail||''};
}

function saveCover(dataUrl, fileName) {
  if (!dataUrl) return '';
  const match = String(dataUrl).match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/);
  if (!match) throw new Error('Format sampul harus JPG, PNG, atau WEBP.');
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 3*1024*1024) throw new Error('Ukuran sampul maksimal 3 MB.');
  let folder;
  const folders = DriveApp.getFoldersByName(CFG.DRIVE_FOLDER);
  folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CFG.DRIVE_FOLDER);
  const ext = match[1].split('/')[1].replace('jpeg','jpg');
  const blob = Utilities.newBlob(bytes, match[1], (fileName||'sampul')+'.'+ext);
  const file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
  return 'https://drive.google.com/thumbnail?id='+file.getId()+'&sz=w400';
}

function addBook(b) {
  setupSheets();
  if (!b || !String(b.title||'').trim()) throw new Error('Judul buku wajib diisi.');
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh=SpreadsheetApp.getActive().getSheetByName(CFG.BOOKS);
    const rows=sh.getDataRange().getValues();
    const isbn=String(b.isbn||'').replace(/[-\s]/g,'');
    const idx=rows.findIndex((r,i)=>i>0 && isbn && String(r[1])===isbn);
    const qty=Math.max(1,Number(b.total)||1);
    const cover=b.coverData ? saveCover(b.coverData,b.title) : (b.cover||'');
    if(idx>0){
      const row=idx+1, oldT=Number(rows[idx][8])||0, oldA=Number(rows[idx][9])||0;
      sh.getRange(row,3,1,6).setValues([[b.title,b.author||'',b.publisher||'',b.year||'',b.category||'',b.shelf||'']]);
      sh.getRange(row,9,1,3).setValues([[oldT+qty,oldA+qty,cover||rows[idx][10]||'']]);
      return {message:'Stok buku diperbarui. Eksemplar baru: '+qty};
    }
    sh.appendRow(['BK-'+Utilities.getUuid().slice(0,8).toUpperCase(),isbn,b.title,b.author||'',b.publisher||'',b.year||'',b.category||'',b.shelf||'',qty,qty,cover,new Date()]);
    return {message:'Buku berhasil ditambahkan.'};
  } finally {lock.releaseLock();}
}

function createLoan(d) {
  setupSheets();
  if(!d || !d.name || !d.isbn) throw new Error('Nama peminjam dan ISBN wajib diisi.');
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const ss=SpreadsheetApp.getActive(), sh=ss.getSheetByName(CFG.BOOKS), rows=sh.getDataRange().getValues();
    const isbn=String(d.isbn).replace(/[-\s]/g,'');
    const idx=rows.findIndex((r,i)=>i>0 && String(r[1])===isbn);
    if(idx<1) throw new Error('ISBN belum terdaftar di koleksi.');
    const qty=Math.max(1,Number(d.qty)||1), available=Number(rows[idx][9])||0;
    if(available<qty) throw new Error('Stok tersedia tidak mencukupi.');
    sh.getRange(idx+1,10).setValue(available-qty);
    const days=Number(ss.getSheetByName(CFG.SETTINGS).getRange('B3').getValue())||7;
    const due=new Date(); due.setDate(due.getDate()+days);
    const id='PJ-'+Utilities.getUuid().slice(0,8).toUpperCase();
    ss.getSheetByName(CFG.LOANS).appendRow([id,new Date(),d.name,d.contact||'',isbn,rows[idx][2],qty,due,'','Dipinjam',d.note||'']);
    return {message:'Peminjaman tersimpan. Jatuh tempo '+fmtDate(due)};
  } finally {lock.releaseLock();}
}

function returnLoan(id) {
  setupSheets();
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const ss=SpreadsheetApp.getActive(), sh=ss.getSheetByName(CFG.LOANS), rows=sh.getDataRange().getValues();
    const i=rows.findIndex((r,n)=>n>0 && String(r[0])===String(id));
    if(i<1) throw new Error('Transaksi tidak ditemukan.');
    if(rows[i][9]!=='Dipinjam') throw new Error('Transaksi sudah dikembalikan.');
    const books=ss.getSheetByName(CFG.BOOKS), br=books.getDataRange().getValues();
    const bi=br.findIndex((r,n)=>n>0 && String(r[1])===String(rows[i][4]));
    if(bi>0) books.getRange(bi+1,10).setValue((Number(br[bi][9])||0)+(Number(rows[i][6])||0));
    sh.getRange(i+1,9,1,2).setValues([[new Date(),'Dikembalikan']]);
    return {message:'Pengembalian berhasil dicatat.'};
  } finally {lock.releaseLock();}
}

function getLoans() {
  setupSheets();
  const rows=SpreadsheetApp.getActive().getSheetByName(CFG.LOANS).getDataRange().getValues();
  return rows.slice(1).filter(r=>r[0]).reverse().map(r=>({
    id:r[0],date:r[1]?fmtDate(new Date(r[1])):'',name:r[2],contact:r[3],isbn:r[4],title:r[5],
    qty:r[6],due:r[7]?fmtDate(new Date(r[7])):'',returned:r[8]?fmtDate(new Date(r[8])):'',status:r[9],
    overdue:r[9]==='Dipinjam' && r[7] && new Date(r[7]).setHours(0,0,0,0)<new Date().setHours(0,0,0,0)
  }));
}

function getMonthlyReport(month) {
  setupSheets();
  const rows=SpreadsheetApp.getActive().getSheetByName(CFG.LOANS).getDataRange().getValues();
  const key=String(month||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM'));
  const selected=rows.slice(1).filter(r=>r[1] && Utilities.formatDate(new Date(r[1]),Session.getScriptTimeZone(),'yyyy-MM')===key);
  const borrowed=selected.reduce((s,r)=>s+(Number(r[6])||0),0);
  const returned=selected.filter(r=>r[9]==='Dikembalikan').length;
  return {month:key,transactions:selected.length,borrowedCopies:borrowed,returnedTransactions:returned,
    active:selected.filter(r=>r[9]==='Dipinjam').length,
    rows:selected.map(r=>({id:r[0],date:fmtDate(new Date(r[1])),name:r[2],title:r[5],qty:r[6],status:r[9]}))};
}

function getSettings() {
  setupSheets();
  const vals=SpreadsheetApp.getActive().getSheetByName(CFG.SETTINGS).getDataRange().getValues();
  const out={};
  vals.slice(1).forEach(r=>out[r[0]]=r[1]);
  return out;
}
function fmtDate(d){return Utilities.formatDate(d,Session.getScriptTimeZone(),'dd/MM/yyyy');}
