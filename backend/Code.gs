/**
 * NammaSpot Google Apps Script backend.
 *
 * GET  ?action=sellers|products|categories|customers|enquiries|reviews
 * POST { action, data } for create/update operations.
 */

const SHEET_ID = "PUT_YOUR_SHEET_ID_HERE";

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

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function rows_(name) {
  const sh = sheet_(name);
  if (!sh) throw new Error("Missing sheet tab: " + name);
  const values = sh.getDataRange().getValues();
  if (!values.length) return [];
  const headers = values.shift();
  return values.filter(function (r) {
    return r.some(function (v) { return String(v).trim().length > 0; });
  }).map(function (r) {
    const obj = {};
    headers.forEach(function (h, i) {
      if (String(h).length) obj[String(h)] = r[i];
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
    if (String(h).trim()) map[String(h).trim().toLowerCase()] = i;
  });
  return { headers: values[0], values: values, map: map };
}

function findRowById_(values, map, id) {
  const idKeys = ["sellerid", "productid", "customerid", "enquiryid", "reviewid", "id"];
  for (let i = 1; i < values.length; i++) {
    for (let k = 0; k < idKeys.length; k++) {
      const idx = map[idKeys[k]];
      if (idx !== undefined && String(values[i][idx]) === String(id)) return i + 1;
    }
  }
  return -1;
}

function appendRow_(sh, data) {
  const meta = headerMap_(sh);
  const row = meta.headers.map(function (h) {
    const key = String(h);
    return data[key] !== undefined ? data[key] : "";
  });
  sh.appendRow(row);
}

function updateRow_(sh, data) {
  const id = data.sellerId || data.productId || data.customerId || data.enquiryId || data.reviewId || data.id;
  if (!id) throw new Error("Update requires an ID");
  const meta = headerMap_(sh);
  const rowNumber = findRowById_(meta.values, meta.map, id);
  if (rowNumber < 2) throw new Error("Record not found: " + id);

  const current = sh.getRange(rowNumber, 1, 1, meta.headers.length).getValues()[0];
  meta.headers.forEach(function (h, i) {
    const key = String(h);
    if (Object.prototype.hasOwnProperty.call(data, key)) current[i] = data[key];
  });
  sh.getRange(rowNumber, 1, 1, meta.headers.length).setValues([current]);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;
    const tab = WRITE_ACTIONS[action];
    if (!tab) return json_({ success: false, error: "Invalid action" });

    const sh = sheet_(tab);
    if (!sh) return json_({ success: false, error: "Missing sheet tab: " + tab });
    const data = body.data || {};

    if (action.indexOf("update") === 0) updateRow_(sh, data);
    else appendRow_(sh, data);

    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}
