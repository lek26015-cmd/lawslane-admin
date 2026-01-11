import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  limit,
  orderBy,
  DocumentData,
  Firestore,
  updateDoc,
  increment
} from 'firebase/firestore';
import type { LawyerProfile, ImagePlaceholder, Ad, Article, Case, UpcomingAppointment, ReportedTicket, LawyerAppointmentRequest, LawyerCase, UserProfile, LegalForm } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const getImageUrl = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl ?? '';
export const getImageHint = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageHint ?? '';

// --- Lawyer Functions ---
export async function getApprovedLawyers(db: Firestore | null): Promise<LawyerProfile[]> {
  if (!db) return [];
  const lawyersRef = collection(db, 'lawyerProfiles');
  const q = query(lawyersRef, where('status', '==', 'approved'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LawyerProfile));
}

export async function getLawyerById(db: Firestore, id: string): Promise<LawyerProfile | undefined> {
  if (!db) return undefined;
  const lawyerRef = doc(db, 'lawyerProfiles', id);
  const docSnap = await getDoc(lawyerRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as LawyerProfile;
  }
  return undefined;
}

// --- Article Functions ---
export async function getAllArticles(db: Firestore | null): Promise<Article[]> {
  if (!db) return [];
  const articlesRef = collection(db, 'articles');
  // const q = query(articlesRef, orderBy('publishedAt', 'desc'));
  const q = query(articlesRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    let publishedAtStr = new Date().toISOString();

    if (data.publishedAt?.toDate) {
      publishedAtStr = data.publishedAt.toDate().toISOString();
    } else if (data.publishedAt instanceof Date) {
      publishedAtStr = data.publishedAt.toISOString();
    } else if (typeof data.publishedAt === 'string') {
      publishedAtStr = data.publishedAt;
    }

    return {
      id: doc.id,
      ...data,
      publishedAt: publishedAtStr
    } as Article
  });
}

export async function getArticleBySlug(db: Firestore, slug: string): Promise<Article | undefined> {
  if (!db) return undefined;
  const articlesRef = collection(db, 'articles');
  const q = query(articlesRef, where('slug', '==', slug), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    let publishedAtStr = new Date().toISOString();

    if (data.publishedAt?.toDate) {
      publishedAtStr = data.publishedAt.toDate().toISOString();
    } else if (data.publishedAt instanceof Date) {
      publishedAtStr = data.publishedAt.toISOString();
    } else if (typeof data.publishedAt === 'string') {
      publishedAtStr = data.publishedAt;
    }

    return {
      id: docSnap.id,
      ...data,
      publishedAt: publishedAtStr
    } as Article;
  }
  return undefined;
}

// --- Ad Functions ---
export async function getAdsByPlacement(db: Firestore | null, placement: 'Homepage Carousel' | 'Lawyer Page Sidebar'): Promise<Ad[]> {
  if (!db) return [];
  const adsRef = collection(db, 'ads');
  const q = query(adsRef, where('placement', '==', placement), where('status', '==', 'active'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
}

export async function getAdById(db: Firestore, id: string): Promise<Ad | undefined> {
  if (!db) return undefined;
  const adRef = doc(db, 'ads', id);
  const docSnap = await getDoc(adRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Ad;
  }
  return undefined;
}

// --- User Dashboard Functions ---
export async function getDashboardData(db: Firestore, userId: string) {
  if (!db) return { cases: [], appointments: [], tickets: [] };

  // 1. Fetch Cases (Chats)
  const chatsRef = collection(db, 'chats');
  const casesQuery = query(chatsRef, where('participants', 'array-contains', userId));
  const casesSnapshot = await getDocs(casesQuery);

  const cases: Case[] = await Promise.all(casesSnapshot.docs.map(async (d) => {
    const data = d.data();
    const lawyerId = data.participants.find((p: string) => p !== userId);
    let lawyer = { id: 'unknown', name: 'Unknown Lawyer', imageUrl: '', imageHint: '' };

    if (lawyerId) {
      const lawyerDoc = await getDoc(doc(db, 'lawyerProfiles', lawyerId));
      if (lawyerDoc.exists()) {
        const lData = lawyerDoc.data();
        lawyer = {
          id: lawyerDoc.id,
          name: lData.name,
          imageUrl: lData.imageUrl || '',
          imageHint: lData.imageHint || ''
        };
      } else {
        // Fallback to users collection if not in lawyerProfiles (e.g. if role changed)
        const userDoc = await getDoc(doc(db, 'users', lawyerId));
        if (userDoc.exists()) {
          lawyer = {
            id: userDoc.id,
            name: userDoc.data().name,
            imageUrl: '',
            imageHint: ''
          }
        }
      }
    }

    return {
      id: d.id,
      title: data.caseTitle || '',
      status: data.status || 'active',
      lastMessage: data.lastMessage || '',
      lastMessageTimestamp: data.lastMessageAt ? data.lastMessageAt.toDate().toISOString() : '',
      lawyer: lawyer,
      updatedAt: data.lastMessageAt ? data.lastMessageAt.toDate() : (data.createdAt?.toDate() || new Date()),
      rejectReason: data.rejectReason || '',
    } as Case;
  }));

  // 2. Fetch Appointments
  const appointmentsRef = collection(db, 'appointments');
  const aptQuery = query(appointmentsRef, where('userId', '==', userId));
  const aptSnapshot = await getDocs(aptQuery);

  const appointments: UpcomingAppointment[] = await Promise.all(aptSnapshot.docs.map(async (d) => {
    const data = d.data();
    let lawyer = { name: 'Unknown Lawyer', imageUrl: '', imageHint: '' };
    if (data.lawyerId) {
      const lawyerDoc = await getDoc(doc(db, 'lawyerProfiles', data.lawyerId));
      if (lawyerDoc.exists()) {
        const lData = lawyerDoc.data();
        lawyer = { name: lData.name, imageUrl: lData.imageUrl || '', imageHint: lData.imageHint || '' };
      }
    }

    return {
      id: d.id,
      date: data.date.toDate(),
      time: data.timeSlot || 'N/A',
      description: data.description || '',
      lawyer: lawyer,
      status: data.status || 'pending',
    } as UpcomingAppointment;
  }));

  // Filter for future appointments only (including today)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const futureAppointments = appointments.filter(apt => apt.date >= todayStart);

  // 3. Fetch Tickets
  const ticketsRef = collection(db, 'tickets');
  const ticketsQuery = query(ticketsRef, where('userId', '==', userId));
  const ticketsSnapshot = await getDocs(ticketsQuery);

  const tickets: ReportedTicket[] = ticketsSnapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      caseId: data.caseId || '',
      lawyerId: data.lawyerId || '',
      caseTitle: data.caseTitle || '',
      problemType: data.problemType || '',
      status: data.status || 'pending',
      reportedAt: data.reportedAt ? data.reportedAt.toDate() : new Date(),
    } as ReportedTicket;
  });

  return {
    cases,
    appointments: futureAppointments,
    tickets
  };
}

// --- Lawyer Dashboard Functions ---

export async function getLawyerDashboardData(db: Firestore, lawyerId: string): Promise<{ newRequests: LawyerAppointmentRequest[], activeCases: LawyerCase[], completedCases: LawyerCase[] }> {
  if (!db) return { newRequests: [], activeCases: [], completedCases: [] };

  let newRequests: LawyerAppointmentRequest[] = [];
  let lawyerCases: LawyerCase[] = [];

  try {
    // Fetch new appointment requests
    const appointmentsRef = collection(db, 'appointments');
    const requestsQuery = query(appointmentsRef, where('lawyerId', '==', lawyerId), where('status', '==', 'pending'));
    const requestsSnapshot = await getDocs(requestsQuery);
    newRequests = await Promise.all(requestsSnapshot.docs.map(async d => {
      const data = d.data();
      let clientName = 'ลูกค้า';
      try {
        if (data.userId) {
          const userDoc = await getDoc(doc(db, 'users', data.userId));
          if (userDoc.exists()) clientName = userDoc.data().name || 'ลูกค้า';
        }
      } catch (e) {
        console.warn("Error fetching client details for request:", e);
      }
      return {
        id: d.id,
        clientName: clientName,
        userId: data.userId || '', // Include userId
        caseTitle: data.description,
        description: data.description,
        requestedAt: data.createdAt?.toDate() || new Date(),
      }
    }));
  } catch (error) {
    console.error("Error fetching lawyer requests:", error);
    // Don't throw, just return empty for this part
  }

  try {
    // Fetch cases (chats)
    const chatsRef = collection(db, 'chats');
    const casesQuery = query(chatsRef, where('participants', 'array-contains', lawyerId));
    const casesSnapshot = await getDocs(casesQuery);
    lawyerCases = await Promise.all(casesSnapshot.docs.map(async (d) => {
      const chatData = d.data();
      const clientParticipantId = chatData.participants.find((p: string) => p !== lawyerId);

      let clientName = 'ลูกค้า';
      if (clientParticipantId) {
        try {
          const userDoc = await getDoc(doc(db, 'users', clientParticipantId));
          if (userDoc.exists()) clientName = userDoc.data().name || 'ลูกค้า';
        } catch (e) {
          console.warn("Error fetching client details for case:", e);
        }
      }

      return {
        id: d.id,
        title: chatData.caseTitle || 'Unknown Case',
        clientName: clientName,
        clientId: clientParticipantId,
        status: chatData.status,
        lastUpdate: chatData.lastMessageAt?.toDate().toLocaleDateString('th-TH') || 'N/A',
      };
    }));
  } catch (error) {
    console.error("Error fetching lawyer cases:", error);
  }

  return {
    newRequests,
    activeCases: lawyerCases.filter(c => c.status === 'active' || c.status === 'pending_payment'),
    completedCases: lawyerCases.filter(c => c.status === 'closed'),
  };
}

export async function getAdminLawyerDashboardData(db: Firestore): Promise<{ newRequests: LawyerAppointmentRequest[], activeCases: LawyerCase[], completedCases: LawyerCase[] }> {
  if (!db) return { newRequests: [], activeCases: [], completedCases: [] };

  let newRequests: LawyerAppointmentRequest[] = [];
  let lawyerCases: LawyerCase[] = [];

  try {
    // Fetch ALL pending appointment requests
    const appointmentsRef = collection(db, 'appointments');
    const requestsQuery = query(appointmentsRef, where('status', '==', 'pending'));
    const requestsSnapshot = await getDocs(requestsQuery);
    newRequests = await Promise.all(requestsSnapshot.docs.map(async d => {
      const data = d.data();
      let clientName = 'ลูกค้า';
      try {
        if (data.userId) {
          const userDoc = await getDoc(doc(db, 'users', data.userId));
          if (userDoc.exists()) clientName = userDoc.data().name || 'ลูกค้า';
        }
      } catch (e) {
        console.warn("Error fetching client details for request:", e);
      }
      return {
        id: d.id,
        clientName: clientName,
        userId: data.userId || '',
        caseTitle: data.description,
        description: data.description,
        requestedAt: data.createdAt?.toDate() || new Date(),
      }
    }));
  } catch (error) {
    console.error("Error fetching admin lawyer requests:", error);
  }

  try {
    // Fetch ALL cases (chats)
    const chatsRef = collection(db, 'chats');
    const casesSnapshot = await getDocs(chatsRef);
    lawyerCases = await Promise.all(casesSnapshot.docs.map(async (d) => {
      const chatData = d.data();
      // For admin view, maybe show both lawyer and client? 
      // For now, let's just try to find the client.
      // Participants usually has 2 IDs. One is lawyer, one is client.
      // It's hard to know which is which without checking roles.
      // But usually the one that is NOT the current user is the "other".
      // Here we are admin, so neither might be us.

      // Let's just take the first participant as "Client" for display purposes if we can't distinguish easily,
      // or try to fetch both names.

      let clientName = 'Unknown';
      let clientId = '';

      if (chatData.participants && chatData.participants.length > 0) {
        // Try to find the one that is a 'user' role, but we don't know roles here easily.
        // Let's just pick the first one for now or try to fetch names.
        clientId = chatData.participants[0];
        try {
          const userDoc = await getDoc(doc(db, 'users', clientId));
          if (userDoc.exists()) clientName = userDoc.data().name || 'Unknown';
        } catch (e) { }
      }

      return {
        id: d.id,
        title: chatData.caseTitle || 'Unknown Case',
        clientName: clientName, // This might be the lawyer's name in some cases, but acceptable for admin overview
        clientId: clientId,
        status: chatData.status,
        lastUpdate: chatData.lastMessageAt?.toDate().toLocaleDateString('th-TH') || 'N/A',
      };
    }));
  } catch (error) {
    console.error("Error fetching admin lawyer cases:", error);
  }

  return {
    newRequests,
    activeCases: lawyerCases.filter(c => c.status === 'active'),
    completedCases: lawyerCases.filter(c => c.status === 'closed'),
  };
}


export async function getLawyerAppointmentRequestById(db: Firestore, id: string): Promise<LawyerAppointmentRequest | undefined> {
  if (!db) return undefined;
  const reqRef = doc(db, 'appointments', id);
  const docSnap = await getDoc(reqRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    let clientName = 'ลูกค้า';
    if (data.userId) {
      const userDoc = await getDoc(doc(db, 'users', data.userId));
      if (userDoc.exists()) clientName = userDoc.data().name;
    }
    return {
      id: docSnap.id,
      clientName: clientName,
      userId: data.userId || '', // Include userId
      caseTitle: data.description,
      description: data.description,
      requestedAt: data.createdAt.toDate(),
    };
  }
  return undefined;
}


// --- Data for Admin pages (can be more complex) ---

export async function getAllUsers(db: Firestore): Promise<UserProfile[]> {
  if (!db) return [];
  const usersRef = collection(db, 'users');
  const q = query(usersRef);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      ...data,
      type: data.type || 'บุคคลทั่วไป',
      status: data.status || 'active',
      registeredAt: (data.registeredAt || data.createdAt)?.toDate().toLocaleDateString('th-TH') || 'N/A'
    } as UserProfile;
  });
}

export async function getAdmins(db: Firestore): Promise<UserProfile[]> {
  if (!db) return [];
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('role', '==', 'admin'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      ...data,
      type: data.type || 'บุคคลทั่วไป',
      status: data.status || 'active',
      registeredAt: (data.registeredAt || data.createdAt)?.toDate().toLocaleDateString('th-TH') || 'N/A'
    } as UserProfile;
  });
}


export async function getAllLawyers(db: Firestore): Promise<LawyerProfile[]> {
  if (!db) return [];
  try {
    const lawyersRef = collection(db, 'lawyerProfiles');
    const querySnapshot = await getDocs(lawyersRef);
    console.log(`[getAllLawyers] Fetched ${querySnapshot.size} lawyers`);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      let joinedAtStr = 'N/A';
      try {
        if (data.joinedAt?.toDate) {
          joinedAtStr = data.joinedAt.toDate().toLocaleDateString('th-TH');
        } else if (data.joinedAt instanceof Date) {
          joinedAtStr = data.joinedAt.toLocaleDateString('th-TH');
        }
      } catch (e) {
        console.warn(`[getAllLawyers] Date error for ${doc.id}:`, e);
      }

      return {
        id: doc.id,
        ...data,
        joinedAt: joinedAtStr
      } as LawyerProfile
    });
  } catch (error) {
    console.error("[getAllLawyers] Error fetching lawyers:", error);
    return [];
  }
}

export async function getAllAds(db: Firestore): Promise<Ad[]> {
  if (!db) return [];
  const adsRef = collection(db, 'ads');
  const querySnapshot = await getDocs(adsRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
}

export async function getAllAdminArticles(db: Firestore): Promise<Article[]> {
  if (!db) return [];
  const articlesRef = collection(db, 'articles');
  const querySnapshot = await getDocs(articlesRef);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article));
}

export async function getArticleById(db: Firestore, id: string): Promise<Article | undefined> {
  if (!db) return undefined;
  const articleRef = doc(db, 'articles', id);
  const docSnap = await getDoc(articleRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Article;
  }
  return undefined;
}


export async function getAllTickets(db: Firestore): Promise<any[]> {
  if (!db) return [];
  const ticketsRef = collection(db, 'tickets');
  const querySnapshot = await getDocs(ticketsRef);
  const tickets = await Promise.all(querySnapshot.docs.map(async (d) => {
    const data = d.data();
    let clientName = 'Unknown User';
    if (data.userId) {
      const userDoc = await getDoc(doc(db, 'users', data.userId));
      if (userDoc.exists()) {
        clientName = userDoc.data().name;
      }
    }
    return {
      id: d.id,
      ...data,
      clientName,
      reportedAt: data.reportedAt.toDate().toLocaleDateString('th-TH'),
    };
  }));
  return tickets;
}

export async function getAdminStats(db: Firestore) {
  if (!db) return {
    totalUsers: 0,
    newUsers: 0,
    activeTicketsCount: 0,
    pendingLawyersCount: 0,
    approvedLawyersCount: 0,
    totalRevenue: 0
  };

  let totalUsers = 0;
  let newUsers = 0;
  let activeTicketsCount = 0;
  let pendingLawyersCount = 0;
  let approvedLawyersCount = 0;

  try {
    // 1. Users Stats
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    totalUsers = usersSnapshot.size;

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    newUsers = usersSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.registeredAt && data.registeredAt.toDate() >= firstDayOfMonth;
    }).length;
  } catch (error) {
    console.warn("Failed to fetch user stats (likely permission error):", error);
  }

  try {
    // 2. Tickets Stats
    const ticketsRef = collection(db, 'tickets');
    const ticketsQuery = query(ticketsRef, where('status', '==', 'pending'));
    const ticketsSnapshot = await getDocs(ticketsQuery);
    activeTicketsCount = ticketsSnapshot.size;
  } catch (error) {
    console.warn("Failed to fetch ticket stats:", error);
  }

  try {
    // 3. Lawyers Stats
    const lawyersRef = collection(db, 'lawyerProfiles');
    const lawyersQuery = query(lawyersRef, where('status', '==', 'pending'));
    const lawyersSnapshot = await getDocs(lawyersQuery);
    pendingLawyersCount = lawyersSnapshot.size;
  } catch (error) {
    console.warn("Failed to fetch lawyer stats:", error);
  }

  try {
    // 4. Approved Lawyers Stats
    const lawyersRef = collection(db, 'lawyerProfiles');
    const approvedQuery = query(lawyersRef, where('status', '==', 'approved'));
    const approvedSnapshot = await getDocs(approvedQuery);
    approvedLawyersCount = approvedSnapshot.size;
  } catch (error) {
    console.warn("Failed to fetch approved lawyer stats:", error);
  }

  return {
    totalUsers,
    newUsers,
    activeTicketsCount,
    pendingLawyersCount,
    approvedLawyersCount,
    totalRevenue: 0
  };
}

export async function getFinancialStats(db: Firestore) {
  if (!db) return {
    totalServiceValue: 0,
    platformRevenueThisMonth: 0,
    platformTotalRevenue: 0,
    monthlyData: []
  };

  let totalServiceValue = 0;
  let platformRevenueThisMonth = 0;
  let platformTotalRevenue = 0;
  const monthlyRevenue: { [key: string]: number } = {};

  try {
    // 1. Calculate from Appointments (assuming 3500 THB per appointment)
    const appointmentsRef = collection(db, 'appointments');
    // Consider 'active' or 'completed' as paid. 'pending_payment' is not paid.
    // For simplicity, let's assume 'active', 'completed', 'closed' are paid.
    // In a real app, we should have a 'paymentStatus' field.
    // Let's use status != 'pending_payment' and != 'cancelled'
    const appointmentsSnapshot = await getDocs(appointmentsRef);

    appointmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status !== 'pending_payment' && data.status !== 'cancelled' && data.status !== 'pending') {
        const amount = 3500; // Fixed price for now
        totalServiceValue += amount;

        const date = data.createdAt ? data.createdAt.toDate() : new Date();
        const monthKey = format(date, 'MMM', { locale: th });
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (amount * 0.15); // Platform share

        const now = new Date();
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          platformRevenueThisMonth += amount * 0.15;
        }
      }
    });

    // 2. Calculate from Chats (assuming 500 THB per chat)
    const chatsRef = collection(db, 'chats');
    const chatsSnapshot = await getDocs(chatsRef);

    chatsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Assuming chats created are paid if not 'pending_payment'
      if (data.status !== 'pending_payment') {
        const amount = 500; // Fixed price
        totalServiceValue += amount;

        const date = data.createdAt ? data.createdAt.toDate() : new Date();
        const monthKey = format(date, 'MMM', { locale: th });
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (amount * 0.15);

        const now = new Date();
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          platformRevenueThisMonth += amount * 0.15;
        }
      }
    });

    platformTotalRevenue = totalServiceValue * 0.15;

  } catch (error) {
    console.error("Error calculating financial stats:", error);
  }

  // Format monthly data for chart
  const monthsOrder = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const monthlyData = monthsOrder.map(month => ({
    month,
    total: monthlyRevenue[month] || 0
  })).filter(d => d.total > 0); // Only show months with revenue

  return {
    totalServiceValue,
    platformRevenueThisMonth,
    platformTotalRevenue,
    monthlyData
  };
}

export async function getLawyerStats(db: Firestore, lawyerId: string) {
  if (!db) return {
    incomeThisMonth: 0,
    totalIncome: 0,
    completedCases: 0,
    rating: 0,
    responseRate: 0
  };

  let incomeThisMonth = 0;
  let totalIncome = 0;
  let completedCases = 0;

  try {
    // 1. Calculate from Appointments
    const appointmentsRef = collection(db, 'appointments');
    const aptQuery = query(appointmentsRef, where('lawyerId', '==', lawyerId), where('status', '==', 'completed'));
    const appointmentsSnapshot = await getDocs(aptQuery);

    appointmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const amount = 3500; // Fixed price
      const lawyerShare = amount * 0.85; // 85% share

      totalIncome += lawyerShare;

      const date = data.createdAt ? data.createdAt.toDate() : new Date();
      const now = new Date();
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        incomeThisMonth += lawyerShare;
      }
      completedCases++;
    });

    // 2. Calculate from Chats
    const chatsRef = collection(db, 'chats');
    // Note: 'participants' array contains lawyerId. We need to filter by status 'closed'.
    // However, Firestore array-contains is already used. We can filter in memory or use composite index.
    // Let's fetch all chats for this lawyer and filter.
    const chatsQuery = query(chatsRef, where('participants', 'array-contains', lawyerId));
    const chatsSnapshot = await getDocs(chatsQuery);

    chatsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'closed') {
        const amount = 500; // Fixed price
        const lawyerShare = amount * 0.85; // 85% share

        totalIncome += lawyerShare;

        const date = data.createdAt ? data.createdAt.toDate() : new Date();
        const now = new Date();
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          incomeThisMonth += lawyerShare;
        }
        completedCases++;
      }
    });

  } catch (error) {
    console.error("Error calculating lawyer stats:", error);
  }

  let rating = 0;
  let responseRate = 0;

  try {
    // 3. Calculate Rating from Reviews
    const reviewsRef = collection(db, 'reviews');
    const reviewsQuery = query(reviewsRef, where('lawyerId', '==', lawyerId));
    const reviewsSnapshot = await getDocs(reviewsQuery);

    if (!reviewsSnapshot.empty) {
      const totalRating = reviewsSnapshot.docs.reduce((acc, doc) => acc + (doc.data().rating || 0), 0);
      rating = totalRating / reviewsSnapshot.size;
    }

    // 4. Calculate Response Rate (Simplified)
    // We'll define response rate as % of chats where the lawyer has sent at least one message.
    // This is an approximation. A better way would be to track "replied" status on the chat doc.
    const allChatsQuery = query(collection(db, 'chats'), where('participants', 'array-contains', lawyerId));
    const allChatsSnapshot = await getDocs(allChatsQuery);

    if (!allChatsSnapshot.empty) {
      let repliedChats = 0;
      // We need to check messages for each chat, which is expensive.
      // Optimization: Check if 'lastMessage' was sent by lawyer? No, lastMessage could be client's.
      // Alternative: Add 'hasLawyerReplied' field to chat doc in the future.
      // For now, let's assume if status is NOT 'pending_payment' and NOT 'pending', the lawyer "responded" (accepted the case).
      // Or better: use the 'status' field. 'active', 'closed' implies engagement. 'pending' implies waiting.

      const engagedChats = allChatsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'active' || data.status === 'closed';
      }).length;

      // Total valid requests (excluding pending payment which are not yet "requests" really)
      const totalRequests = allChatsSnapshot.docs.filter(doc => doc.data().status !== 'pending_payment').length;

      if (totalRequests > 0) {
        responseRate = (engagedChats / totalRequests) * 100;
      } else {
        responseRate = 100; // No requests yet, give benefit of doubt
      }
    } else {
      responseRate = 100;
    }

  } catch (error) {
    console.error("Error calculating extra stats:", error);
  }

  return {
    incomeThisMonth,
    totalIncome,
    completedCases,
    rating: Number(rating.toFixed(1)),
    responseRate: Math.round(responseRate)
  };
}

export async function getLawyersByFirm(db: Firestore, firmId: string): Promise<LawyerProfile[]> {
  if (!db) return [];
  const lawyersRef = collection(db, 'lawyerProfiles');
  const q = query(lawyersRef, where('firmId', '==', firmId), where('status', '==', 'approved'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LawyerProfile));
}

// --- Legal Form Functions ---

export async function getAllLegalForms(db: Firestore): Promise<LegalForm[]> {
  if (!db) return [];
  const formsRef = collection(db, 'legalForms');
  const q = query(formsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LegalForm));
}

export async function getLegalFormById(db: Firestore, id: string): Promise<LegalForm | undefined> {
  if (!db) return undefined;
  const formRef = doc(db, 'legalForms', id);
  const docSnap = await getDoc(formRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as LegalForm;
  }
  return undefined;
}

export async function incrementFormDownloads(db: Firestore, id: string) {
  if (!db) return;
  const formRef = doc(db, 'legalForms', id);
  await updateDoc(formRef, {
    downloads: increment(1)
  });
}