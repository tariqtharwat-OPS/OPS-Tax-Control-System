"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTransfer = exports.validateInventorySource = exports.validatePayment = exports.validatePurchase = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
// 1. Validate Purchase Creation
exports.validatePurchase = functions.firestore
    .document('purchases/{purchaseId}')
    .onCreate(async (snap, context) => {
    const data = snap.data();
    // Enforce required fields
    if (!data.supplierId || !data.locationId || !data.nitku || !data.batchId) {
        console.error("Missing core fields");
        return snap.ref.delete();
    }
    if (!data.lineItems || data.lineItems.length === 0) {
        console.error("No line items");
        return snap.ref.delete();
    }
    // Enforce 'no-ID fisherman' enhanced evidence rule
    const supplierDoc = await admin.firestore().collection('suppliers').doc(data.supplierId).get();
    if (!supplierDoc.exists)
        return snap.ref.delete();
    const supplier = supplierDoc.data();
    if (!supplier.nik && !supplier.npwp) {
        // Must require declaration, witness, photo
        if (!data.hasDeclarationLetter || !data.hasWitness || !data.hasPhoto) {
            console.error("Blocked invalid transaction: Missing enhanced evidence for no-ID supplier.");
            return snap.ref.delete();
        }
    }
    return null;
});
// 2. Cannot create payment without proof
exports.validatePayment = functions.firestore
    .document('payments/{payId}')
    .onCreate(async (snap) => {
    const data = snap.data();
    if (!data.proofRef) {
        console.error("Blocked payment: no proof");
        return snap.ref.delete();
    }
    return null;
});
// 3. Cannot create inventory without purchase link (for origin)
exports.validateInventorySource = functions.firestore
    .document('inventory/{invId}')
    .onCreate(async (snap) => {
    const data = snap.data();
    if (!data.sourcePurchaseId && data.quantityReceived > 0) {
        if (!data.batchId.includes('-RCV') && !data.sourcePurchaseId) {
            console.error("Blocked inventory: no source linked");
            return snap.ref.delete();
        }
    }
    return null;
});
// 4. Cannot create transfer without source batch
exports.validateTransfer = functions.firestore
    .document('transfers/{trfId}')
    .onCreate(async (snap) => {
    const data = snap.data();
    if (!data.lines || data.lines.length === 0) {
        console.error("Blocked transfer: no lines");
        return snap.ref.delete();
    }
    for (const line of data.lines) {
        if (!line.batchId) {
            console.error("Blocked transfer: missing batch source");
            return snap.ref.delete();
        }
    }
});
//# sourceMappingURL=index.js.map