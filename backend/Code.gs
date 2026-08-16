/**
 * NammaSpot Google Apps Script backend.
 *
 * GET  ?action=sellers|products|categories|customers|enquiries|reviews
 * POST { action, data } for create/update operations.
 *
 * Configure the spreadsheet once in Apps Script:
 * Project Settings -> Script Properties -> SHEET_ID
 * Never commit the spreadsheet ID or other secrets to the repository.
 */

const TABLES = {
  sellers: "Sellers",
  products: "Products",
  categories: "Categories",
  customers: "Customers",
  enquiries: "Enquiries",
  reviews: "Reviews",
};

const WRITE_ACTIONS = {
  addSeller: "Sellers",
  addProduct: "Products",
  addCustomer: "Customers",
  addEnquiry: "Enquiries",
  addReview: "Reviews",
  updateSeller: "Sellers",
  updateProduct: "Products",
  updateCustomer: "Customers",
  updateEnquiry: "Enquiries",
  updateReview: "Reviews",
};

const ID_KEYS = ["sellerId", "productId", "customerId", "enquiryId", "reviewId", "id"];

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetId_() {
  const value = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!value) throw new Error("SHEET_ID is not configured in Apps Script Script Properties");
  return value;
}

function sheet_(name) {
  const sh = SpreadsheetApp.openById(sheetId_()).getSheetByName(name);
  if (!sh) throw new Error("Missing sheet tab: " + name);
  return sh;
}

function rows_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  if (!values.length) return [];

  const headers = values.shift();
  return values
    .filter(function (r) {
      return r.some(function (v) { return String(v).trim().length > 0; });
    })
    .map(function (r) {
      const obj = {};
      headers.forEach(function (h, i) {
        if (String(h).trim()) obj[String(h)] = r[i];
      });
      return obj;
    });
}

function doGet(e) {
  const action = ((e && e.parameter && e.parameter.action) || "sellers").toString();
  const tab = TABLES[action];
  if (!tab) return json_({ success: false, error: "Invalid action" });

  try {
    return json_({ success: true, data: rows_(tab) });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

function headerMap_(sh) {
  const values = sh.getDataRange().getValues();
  if (!values.length) throw new Error("Sheet has no header row");

  const map = {};
  values[0].forEach(function (h, i) {
    const key = String(h).trim().toLowerCase();
    if (key) map[key] = i;
  });

  return { headers: values[0], values: values, map: map };
}

function recordId_(data) {
  for (let i = 0; i < ID_KEYS.length; i++) {
    if (data[ID_KEYS[i]] !== undefined && String(data[ID_KEYS[i]]).trim()) {
      return String(data[ID_KEYS[i]]).trim();
    }
  }
  return "";
}

function findRowById_(values, map, id) {
  for (let i = 1; i < values.length; i++) {
    for (let k = 0; k < ID_KEYS.length; k++) {
      const idx = map[ID_KEYS[k].toLowerCase()];
      if (idx !== undefined && String(values[i][idx]).trim() === String(id).trim()) {
        return i + 1;
      }
    }
  }
  return -1;
}

function appendRow_(sh, data) {
  const meta = headerMap_(sh);
  const id = recordId_(data);

  // Prevent duplicate creates when the client retries a request.
  if (id && findRowById_(meta.values, meta.map, id) > 1) {
    return { created: false, duplicate: true };
  }

  const row = meta.headers.map(function (h) {
    const key = String(h);
    return data[key] !== undefined ? data[key] : "";
  });
  sh.appendRow(row);
  return { created: true, duplicate: false };
}

function updateRow_(sh, data) {
  const id = recordId_(data);
  if (!id) throw new Error("Update requires a record ID");

  const meta = headerMap_(sh);
  const rowNumber = findRowById_(meta.values, meta.map, id);
  if (rowNumber < 2) throw new Error("Record not found: " + id);

  const current = sh.getRange(rowNumber, 1, 1, meta.headers.length).getValues()[0];
  meta.headers.forEach(function (h, i) {
    const key = String(h);
    if (Object.prototype.hasOwnProperty.call(data, key)) current[i] = data[key];
  });
  sh.getRange(rowNumber, 1, 1, meta.headers.length).setValues([current]);
  return { updated: true };
}

function validate_(action, data) {
  const id = recordId_(data);
  if (action.indexOf("update") === 0 && !id) throw new Error("Update requires a record ID");

  if (action === "addSeller" && !String(data.sellerId || "").trim()) throw new Error("sellerId is required");
  if (action === "addProduct" && !String(data.productId || "").trim()) throw new Error("productId is required");
  if (action === "addCustomer" && !String(data.customerId || "").trim()) throw new Error("customerId is required");
  if (action === "addEnquiry" && !String(data.enquiryId || "").trim()) throw new Error("enquiryId is required");
  if (action === "addReview" && !String(data.reviewId || "").trim()) throw new Error("reviewId is required");
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = body.action;
    const tab = WRITE_ACTIONS[action];
    if (!tab) return json_({ success: false, error: "Invalid action" });

    const data = body.data || {};
    validate_(action, data);

    const sh = sheet_(tab);
    const result = action.indexOf("update") === 0
      ? updateRow_(sh, data)
      : appendRow_(sh, data);

    return json_({ success: true, data: result });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}
