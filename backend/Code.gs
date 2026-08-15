/**
 * NammaSpot — Google Apps Script backend (free tier).
 *
 * The live website already talks to this API shape:
 *
 *   GET  ?action=sellers | products | categories | customers | enquiries | reviews
 *        -> { success: true, data: [ ...rows ] }
 *
 *   POST { action: "addSeller" | "addProduct" | "addCustomer" | "addEnquiry" | "addReview",
 *          data: { ...columnName: value } }
 *        -> { success: true }
 *
 * Reads already work on your deployment. Paste the doPost part below into the
 * same Apps Script project and re-deploy (Deploy > Manage deployments > Edit >
 * New version) to switch on writes for enquiries, sellers and products.
 *
 * Sheet tabs (row 1 = headers): Sellers, Products, Categories, Customers,
 * Enquiries, Reviews.
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
};

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function sheet_(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function rows_(name) {
  const sh = sheet_(name);
  if (!sh) throw new Error("Missing sheet tab: " + name);
  const values = sh.getDataRange().getValues();
  const headers = values.shift();
  return values
    .filter(function (r) {
      return String(r[0]).length > 0;
    })
    .map(function (r) {
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

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const tab = WRITE_ACTIONS[body.action];
    if (!tab) return json_({ success: false, error: "Invalid action" });

    const sh = sheet_(tab);
    if (!sh) return json_({ success: false, error: "Missing sheet tab: " + tab });

    const headers = sh.getDataRange().getValues()[0];
    const data = body.data || {};
    const row = headers.map(function (h) {
      const key = String(h);
      return data[key] !== undefined ? data[key] : "";
    });
    sh.appendRow(row);
    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}
