/** NammaSpot Google Apps Script backend. Keep secrets in Script Properties. */

var TABLES = {
  sellers: { tab: "Sellers", idKey: "sellerId" },
  products: { tab: "Products", idKey: "productId" },
  categories: { tab: "Categories", idKey: "categoryId" },
  customers: { tab: "Customers", idKey: "customerId" },
  enquiries: { tab: "Enquiries", idKey: "enquiryId" },
  reviews: { tab: "Reviews", idKey: "reviewId" },
};

var LEGACY = {
  addSeller: { table: "sellers", mode: "create" }, addProduct: { table: "products", mode: "create" },
  addCustomer: { table: "customers", mode: "create" }, addEnquiry: { table: "enquiries", mode: "create" },
  addReview: { table: "reviews", mode: "create" }, updateSeller: { table: "sellers", mode: "update" },
  updateProduct: { table: "products", mode: "update" }, updateCustomer: { table: "customers", mode: "update" },
  updateEnquiry: { table: "enquiries", mode: "update" }, updateReview: { table: "reviews", mode: "update" },
};

function prop_(name) { return PropertiesService.getScriptProperties().getProperty(name); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function ok_(data) { return json_({ success: true, data: data === undefined ? null : data }); }
function fail_(err) { return json_({ success: false, error: String(err && err.message ? err.message : err) }); }
function spreadsheet_() { var id = prop_("SHEET_ID"); if (!id) throw new Error("SHEET_ID script property is not set"); return SpreadsheetApp.openById(id); }
function sheet_(tabName, headerKeys) { var ss = spreadsheet_(); var sh = ss.getSheetByName(tabName); if (!sh) { sh = ss.insertSheet(tabName); if (headerKeys && headerKeys.length) sh.appendRow(headerKeys); } return sh; }
function headers_(sh) { var lastCol = sh.getLastColumn(); if (lastCol < 1) return []; return sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); }); }
function ensureHeaders_(sh, keys) { var current = headers_(sh); var lower = current.map(function(h) { return h.toLowerCase(); }); var missing = []; keys.forEach(function(k) { if (lower.indexOf(String(k).toLowerCase()) === -1) missing.push(k); }); if (!missing.length) return current; var start = current.length + 1; sh.getRange(1, start, 1, missing.length).setValues([missing]); return current.concat(missing); }
function rows_(tabName) { var sh = sheet_(tabName, []); var values = sh.getDataRange().getValues(); if (values.length < 2) return []; var head = values.shift(); return values.filter(function(r) { return r.some(function(v) { return String(v).trim().length > 0; }); }).map(function(r) { var obj = {}; head.forEach(function(h, i) { var key = String(h).trim(); if (!key) return; var v = r[i]; obj[key] = v instanceof Date ? Utilities.formatDate(v, "UTC", "yyyy-MM-dd") : v; }); return obj; }); }
function doGet(e) { try { var action = String((e && e.parameter && e.parameter.action) || "sellers"); var cfg = TABLES[action]; if (!cfg) return fail_("Invalid action: " + action); return ok_(rows_(cfg.tab)); } catch (err) { return fail_(err); } }
function columnIndex_(head, key) { var lower = String(key).toLowerCase(); for (var i = 0; i < head.length; i++) if (String(head[i]).trim().toLowerCase() === lower) return i; return -1; }
function findRow_(sh, head, idKey, id) { var col = columnIndex_(head, idKey); if (col === -1) return -1; var last = sh.getLastRow(); if (last < 2) return -1; var values = sh.getRange(2, col + 1, last - 1, 1).getValues(); for (var i = 0; i < values.length; i++) if (String(values[i][0]).trim() === String(id).trim()) return i + 2; return -1; }
function columnKey_(data, header) { var lower = String(header).trim().toLowerCase(); if (!lower) return null; var keys = Object.keys(data); for (var i = 0; i < keys.length; i++) if (keys[i].toLowerCase() === lower) return keys[i]; return null; }
function writeRecord_(tableKey, mode, data) { var cfg = TABLES[tableKey]; if (!cfg) throw new Error("Invalid table: " + tableKey); if (!data || typeof data !== "object") throw new Error("Missing data"); var id = data[cfg.idKey]; if (!id) throw new Error("Missing " + cfg.idKey); var lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) throw new Error("Backend is busy, please retry"); try { var keys = Object.keys(data); var sh = sheet_(cfg.tab, keys); var head = ensureHeaders_(sh, keys); var rowNumber = findRow_(sh, head, cfg.idKey, id); if (mode === "create" && rowNumber === -1) { var fresh = head.map(function(h) { var k = columnKey_(data, h); return k === null ? "" : data[k]; }); sh.appendRow(fresh); SpreadsheetApp.flush(); return { id: id, created: true }; } if (rowNumber === -1) throw new Error("Record not found: " + id); var range = sh.getRange(rowNumber, 1, 1, head.length); var current = range.getValues()[0]; head.forEach(function(h, i) { var k = columnKey_(data, h); if (k !== null) current[i] = data[k]; }); range.setValues([current]); SpreadsheetApp.flush(); return { id: id, created: false }; } finally { lock.releaseLock(); } }

/* Admin authentication: password is stored only in Script Properties. */
function authSecret_() { return prop_("AUTH_SECRET") || prop_("ADMIN_PASSWORD") || ""; }
function b64_(value) { return Utilities.base64EncodeWebSafe(value).replace(/=+$/, ""); }
function sign_(value) { var secret = authSecret_(); if (!secret) throw new Error("AUTH_SECRET script property is not set"); var bytes = Utilities.computeHmacSha256Signature(value, secret); return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ""); }
function issueAdminToken_() { var expiresAt = Date.now() + 8 * 60 * 60 * 1000; var payload = String(expiresAt); return b64_(payload) + "." + sign_(payload); }
function verifyAdminToken_(token) { try { var parts = String(token || "").split("."); if (parts.length !== 2) return false; var payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString(); var expiresAt = Number(payload); if (!expiresAt || Date.now() >= expiresAt) return false; return sign_(payload) === parts[1]; } catch (err) { return false; } }
function authenticateAdmin_(password) { var expected = prop_("ADMIN_PASSWORD"); if (!expected) throw new Error("ADMIN_PASSWORD script property is not set"); if (String(password || "") !== String(expected)) throw new Error("Invalid access code"); return { token: issueAdminToken_(), expiresAt: Date.now() + 8 * 60 * 60 * 1000 }; }

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var action = String(body.action || "");
    if (action === "authenticateAdmin") return ok_(authenticateAdmin_(body.password));
    if (action === "verifyAdmin") return ok_({ valid: verifyAdminToken_(body.token) });

    var expected = prop_("WRITE_TOKEN");
    if (expected && String(body.token || "") !== expected) return fail_("Unauthorized");
    var table = body.table ? String(body.table) : null;
    var mode = null;
    if (action === "create" || action === "update") mode = action;
    else if (LEGACY[action]) { table = LEGACY[action].table; mode = LEGACY[action].mode; }
    else return fail_("Invalid action: " + action);
    return ok_(writeRecord_(table, mode, body.data || {}));
  } catch (err) { return fail_(err); }
}
