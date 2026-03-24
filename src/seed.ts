import { writeBatch, doc, collection, setDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Location, Supplier, InventoryBatch, Purchase } from './types';

export const seedData = async () => {
  if (!window.confirm("Run seed data script? Warning: This will generate test docs.")) return;
  
  try {
    const batch = writeBatch(db);

    // 1. Locations
    const locations: Location[] = [
      { id: 'loc1', name: 'Jakarta (HQ)', siteCode: 'CGK', nitku: 'HQ-001' },
      { id: 'loc2', name: 'Surabaya', siteCode: 'SUB', nitku: 'SUB-002' },
      { id: 'loc3', name: 'Kaimana', siteCode: 'KNG', nitku: 'KNG-003' },
      { id: 'loc4', name: 'Saumlaki', siteCode: 'SXK', nitku: 'SXK-004' }
    ];
    
    for (const loc of locations) {
      batch.set(doc(db, 'locations', loc.id), loc);
    }

    // 2. Suppliers
    const suppliers: Supplier[] = [
      { id: 'sup1', supplierId: 'SUP-001', type: 'fisherman', name: 'Budi Santoso', nik: '317123456789', npwp: '123456789', village: 'Village A', island: 'Java', identityStatus: 'verified', isActive: true },
      { id: 'sup2', supplierId: 'SUP-002', type: 'fisherman', name: 'Remote John (No ID)', identityStatus: 'pending', isActive: true },
      { id: 'sup3', supplierId: 'SUP-003', type: 'collector', name: 'PT Ocean Supply', npwp: '987654321', identityStatus: 'verified', isActive: true }
    ];

    for (const sup of suppliers) {
      batch.set(doc(db, 'suppliers', sup.id), sup);
    }

    // 3. Purchase & Inventory (Simulated)
    const pRef = doc(collection(db, 'purchases'));
    const bRef = doc(collection(db, 'inventory'));
    const species = 'Yellowfin Tuna';
    const weight = 1500;
    
    batch.set(pRef, {
      transactionId: 'TX-CGK-1234',
      purchaseDate: new Date().toISOString(),
      supplierId: 'sup1',
      locationId: 'loc1',
      paymentStatus: 'pending',
      lineItems: [
        { id: 'L1', species, size: 'L', grade: 'A', condition: 'Fresh', weightKg: weight, pricePerKg: 50000, totalValue: 50000 * weight }
      ],
      totalAmount: 50000 * weight,
      createdAt: new Date().toISOString()
    });

    batch.set(bRef, {
      batchId: 'BATCH-CGK-1234-TUNA',
      locationId: 'loc1',
      sourcePurchaseId: pRef.id,
      species,
      size: 'L',
      grade: 'A',
      quantityReceived: weight,
      quantityUsed: 0,
      quantityTransferred: 0,
      quantitySold: 0,
      quantityRemaining: weight,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    // 4. Admin User Profile Config (We assume Firebase Auth is empty, so we just setup a user doc for whoever logs in first)
    // Normally we'd do this differently but for seeding we can just do it manually.
    
    await batch.commit();
    alert('Seed data executed successfully!');
  } catch (err: any) {
    alert('Seed error: ' + err.message);
  }
};
