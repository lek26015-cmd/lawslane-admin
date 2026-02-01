import { initializeFirebase } from '@/firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export interface ContractParty {
    name: string;
    email?: string;
    id_card?: string;
    address?: string;
    signature?: string; // Base64 or URL
    signedAt?: Timestamp;
}

export interface ContractData {
    id: string;
    title: string;
    content?: string; // HTML or text description

    // Structured Data from the Screenshot Parser
    employer: ContractParty;
    contractor: ContractParty;

    task: string;
    price: number;
    deposit?: number;
    deadline: string;
    paymentTerms?: string;

    status: 'draft' | 'pending' | 'signed' | 'completed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

const COLLECTION_NAME = 'contracts';

// Helper to recursively remove undefined values (Firestore doesn't accept undefined)
function cleanObject(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(cleanObject);

    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value !== undefined) {
            cleaned[key] = typeof value === 'object' && value !== null && !value._methodName
                ? cleanObject(value)
                : value;
        }
    }
    return cleaned;
}

export const contractService = {
    // Create a new contract
    async createContract(data: Omit<ContractData, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
        const { firestore } = initializeFirebase();
        if (!firestore) throw new Error('Firestore not initialized');

        const id = uuidv4();
        const now = serverTimestamp();

        const contract = cleanObject({
            ...data,
            id,
            status: 'pending',
            createdAt: now,
            updatedAt: now,
        });

        await setDoc(doc(firestore, COLLECTION_NAME, id), contract);
        return id;
    },

    // Get a contract by ID
    async getContract(id: string): Promise<ContractData | null> {
        const { firestore } = initializeFirebase();
        if (!firestore) throw new Error('Firestore not initialized');

        const docRef = doc(firestore, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as ContractData;
        } else {
            return null;
        }
    },

    // Sign a contract
    async signContract(id: string, role: 'employer' | 'contractor', signature: string) {
        const { firestore } = initializeFirebase();
        if (!firestore) throw new Error('Firestore not initialized');

        const docRef = doc(firestore, COLLECTION_NAME, id);
        const now = Timestamp.now();

        // Update successful
        await updateDoc(docRef, {
            [`${role}.signature`]: signature,
            [`${role}.signedAt`]: now,
            updatedAt: now
        });

        // Check if both signed to update status
        const currentDoc = await getDoc(docRef);
        const data = currentDoc.data() as ContractData;

        if (data.employer.signature && data.contractor.signature) {
            await updateDoc(docRef, {
                status: 'signed',
                updatedAt: now
            });
        }
    },

    // Real-time subscription
    subscribeToContract(id: string, callback: (data: ContractData) => void) {
        const { firestore } = initializeFirebase();
        if (!firestore) return () => { };

        const docRef = doc(firestore, COLLECTION_NAME, id);
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                callback(doc.data() as ContractData);
            }
        });
    }
};
