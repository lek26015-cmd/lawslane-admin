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
  increment,
  getCountFromServer,
  writeBatch
} from 'firebase/firestore';
import type { LawyerProfile, ImagePlaceholder, Ad, Article, Case, UpcomingAppointment, ReportedTicket, LawyerAppointmentRequest, LawyerCase, UserProfile, LegalForm } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const getImageUrl = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl ?? '';
export const getImageHint = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageHint ?? '';

// --- Lawyer Functions ---
export async function getApprovedLawyers(db: Firestore): Promise<LawyerProfile[]> {
  if (!db) return [];
  try {
    const lawyersRef = collection(db, 'lawyerProfiles');
    const q = query(lawyersRef, where('status', '==', 'approved'), limit(50));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LawyerProfile));
  } catch (error) {
    console.error("Error fetching approved lawyers:", error);
    return [];
  }
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
  const q = query(articlesRef, orderBy('publishedAt', 'desc'), limit(50));
  // const q = query(articlesRef);
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

  // 1. Fetch Cases (Chats) - Use dual query for reliability
  const chatsRef = collection(db, 'chats');

  // Query by participants array (primary method)
  const participantsQuery = query(chatsRef, where('participants', 'array-contains', userId), limit(50));
  const participantsSnapshot = await getDocs(participantsQuery);

  // Query by userId field (fallback method for older/inconsistent docs)
  const userIdQuery = query(chatsRef, where('userId', '==', userId), limit(50));
  const userIdSnapshot = await getDocs(userIdQuery);

  // Merge results, avoiding duplicates
  const seenIds = new Set<string>();
  const allChatDocs = [...participantsSnapshot.docs, ...userIdSnapshot.docs].filter(doc => {
    if (seenIds.has(doc.id)) return false;
    seenIds.add(doc.id);
    return true;
  });

  // Extract all unique lawyer IDs to fetch them in one batch
  const lawyerIds = new Set<string>();
  allChatDocs.forEach(d => {
    const data = d.data();
    const lawyerId = data.participants?.find((p: string) => p !== userId) || data.lawyerId;
    if (lawyerId) lawyerIds.add(lawyerId);
  });

  // Fetch all needed lawyer profiles in parallel (batch of 30)
  const lawyerProfiles: Record<string, any> = {};
  if (lawyerIds.size > 0) {
    const idsArray = Array.from(lawyerIds);
    // Firestore "in" query limited to 30 items
    const chunks = [];
    for (let i = 0; i < idsArray.length; i += 30) {
      chunks.push(idsArray.slice(i, i + 30));
    }

    const profilesSnapshots = await Promise.all(chunks.map(chunk =>
      getDocs(query(collection(db, 'lawyerProfiles'), where('__name__', 'in', chunk)))
    ));

    profilesSnapshots.forEach(snap => {
      snap.docs.forEach(doc => {
        lawyerProfiles[doc.id] = doc.data();
      });
    });

    // Check users collection as fallback for those not in lawyerProfiles
    const missingIds = idsArray.filter(id => !lawyerProfiles[id]);
    if (missingIds.length > 0) {
      const missingChunks = [];
      for (let i = 0; i < missingIds.length; i += 30) {
        missingChunks.push(missingIds.slice(i, i + 30));
      }
      const userSnapshots = await Promise.all(missingChunks.map(chunk =>
        getDocs(query(collection(db, 'users'), where('__name__', 'in', chunk)))
      ));
      userSnapshots.forEach(snap => {
        snap.docs.forEach(doc => {
          lawyerProfiles[doc.id] = doc.data();
        });
      });
    }
  }

  const cases: Case[] = allChatDocs.map((d) => {
    const data = d.data();
    const lawyerId = data.participants?.find((p: string) => p !== userId) || data.lawyerId;
    const lData = lawyerProfiles[lawyerId];

    const lawyer = lData ? {
      id: lawyerId,
      name: lData.name || 'Unknown Lawyer',
      imageUrl: lData.imageUrl || '',
      imageHint: lData.imageHint || ''
    } : { id: lawyerId || 'unknown', name: 'Unknown Lawyer', imageUrl: '', imageHint: '' };

    return {
      id: d.id,
      title: data.caseTitle || '',
      status: data.status || 'active',
      lastMessage: data.lastMessage || '',
      lastMessageTimestamp: data.lastMessageAt ? data.lastMessageAt.toDate().toISOString() : '',
      lawyer: lawyer,
      updatedAt: data.lastMessageAt ? data.lastMessageAt.toDate() : (data.createdAt?.toDate() || new Date()),
      rejectReason: data.rejectReason || '',
      hasNewMessage: data.hasNewMessage || false,
    } as Case;
  }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  // 2. Fetch Appointments
  const appointmentsRef = collection(db, 'appointments');
  const aptQuery = query(appointmentsRef, where('userId', '==', userId), orderBy('date', 'desc'), limit(50));
  const aptSnapshot = await getDocs(aptQuery);

  // Already have some lawyer profiles from chats, but might need more for appointments
  const aptLawyerIds = new Set<string>();
  aptSnapshot.docs.forEach(d => {
    const lId = d.data().lawyerId;
    if (lId && !lawyerProfiles[lId]) aptLawyerIds.add(lId);
  });

  if (aptLawyerIds.size > 0) {
    const idsArray = Array.from(aptLawyerIds);
    const chunks = [];
    for (let i = 0; i < idsArray.length; i += 30) {
      chunks.push(idsArray.slice(i, i + 30));
    }
    const profilesSnapshots = await Promise.all(chunks.map(chunk =>
      getDocs(query(collection(db, 'lawyerProfiles'), where('__name__', 'in', chunk)))
    ));
    profilesSnapshots.forEach(snap => {
      snap.docs.forEach(doc => {
        lawyerProfiles[doc.id] = doc.data();
      });
    });
  }

  const appointments: UpcomingAppointment[] = aptSnapshot.docs.map((d) => {
    const data = d.data();
    const lData = lawyerProfiles[data.lawyerId];
    const lawyer = lData ? {
      name: lData.name,
      imageUrl: lData.imageUrl || '',
      imageHint: lData.imageHint || ''
    } : { name: 'Unknown Lawyer', imageUrl: '', imageHint: '' };

    return {
      id: d.id,
      date: data.date.toDate(),
      time: data.timeSlot || 'N/A',
      description: data.description || '',
      lawyer: lawyer,
      status: data.status || 'pending',
    } as UpcomingAppointment;
  });

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

  try {
    // 1. Fetch appointments and chats in parallel
    const appointmentsRef = collection(db, 'appointments');
    const requestsQuery = query(appointmentsRef, where('lawyerId', '==', lawyerId), where('status', '==', 'pending'), limit(50));

    const chatsRef = collection(db, 'chats');
    const casesQuery = query(chatsRef, where('participants', 'array-contains', lawyerId), limit(100));

    const [requestsSnapshot, casesSnapshot] = await Promise.all([
      getDocs(requestsQuery),
      getDocs(casesQuery)
    ]);

    // 2. Collect all unique user IDs to fetch in one batch
    const userIds = new Set<string>();
    requestsSnapshot.docs.forEach(d => { if (d.data().userId) userIds.add(d.data().userId); });
    casesSnapshot.docs.forEach(d => {
      const clientParticipantId = d.data().participants.find((p: string) => p !== lawyerId);
      if (clientParticipantId) userIds.add(clientParticipantId);
    });

    const userProfiles: Record<string, any> = {};
    if (userIds.size > 0) {
      const idsArray = Array.from(userIds);
      const chunks = [];
      for (let i = 0; i < idsArray.length; i += 30) {
        chunks.push(idsArray.slice(i, i + 30));
      }
      const userSnaps = await Promise.all(chunks.map(chunk =>
        getDocs(query(collection(db, 'users'), where('__name__', 'in', chunk)))
      ));
      userSnaps.forEach(snap => {
        snap.docs.forEach(doc => { userProfiles[doc.id] = doc.data(); });
      });
    }

    // 3. Map results
    const newRequests = requestsSnapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        clientName: userProfiles[data.userId]?.name || 'ลูกค้า',
        userId: data.userId || '',
        caseTitle: data.description,
        description: data.description,
        requestedAt: data.createdAt?.toDate() || new Date(),
      };
    });

    const lawyerCases = casesSnapshot.docs.map(d => {
      const chatData = d.data();
      const clientParticipantId = chatData.participants.find((p: string) => p !== lawyerId);

      // Calculate if unread for lawyer
      const lastMessageAt = chatData.lastMessageAt?.toDate() || chatData.createdAt?.toDate() || new Date(0);
      const lawyerReadAt = chatData.lawyerReadAt?.toDate() || new Date(0);
      const isUnread = lastMessageAt > lawyerReadAt;
      const lastMessage = chatData.lastMessage || '';

      return {
        id: d.id,
        title: chatData.caseTitle || 'Unknown Case',
        clientName: userProfiles[clientParticipantId]?.name || 'ลูกค้า',
        clientId: clientParticipantId,
        status: chatData.status,
        lastUpdate: lastMessageAt.toLocaleDateString('th-TH') || 'N/A',
        updatedAt: lastMessageAt,
        notifications: isUnread ? 1 : 0, // Using 1 as a flag for "has new messages"
        lastMessage: lastMessage,
      };
    });

    return {
      newRequests,
      activeCases: lawyerCases
        .filter(c => c.status === 'active' || c.status === 'pending_payment')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
      completedCases: lawyerCases
        .filter(c => c.status === 'closed')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    };

  } catch (error) {
    console.error("Error fetching lawyer dashboard data:", error);
    return { newRequests: [], activeCases: [], completedCases: [] };
  }
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
  const q = query(usersRef, limit(100));
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
    const querySnapshot = await getDocs(query(lawyersRef, limit(100)));
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
  const querySnapshot = await getDocs(query(adsRef, limit(100)));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
}

export async function getAllAdminArticles(db: Firestore): Promise<Article[]> {
  if (!db) return [];
  const articlesRef = collection(db, 'articles');
  const querySnapshot = await getDocs(query(articlesRef, limit(100)));
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
  const querySnapshot = await getDocs(query(ticketsRef, limit(100)));

  // Collect user IDs for batch fetching
  const userIds = new Set<string>();
  querySnapshot.docs.forEach(d => { if (d.data().userId) userIds.add(d.data().userId); });

  const userProfiles: Record<string, any> = {};
  if (userIds.size > 0) {
    const idsArray = Array.from(userIds);
    const chunks = [];
    for (let i = 0; i < idsArray.length; i += 30) {
      chunks.push(idsArray.slice(i, i + 30));
    }
    const userSnaps = await Promise.all(chunks.map(chunk =>
      getDocs(query(collection(db, 'users'), where('__name__', 'in', chunk)))
    ));
    userSnaps.forEach(snap => {
      snap.docs.forEach(doc => { userProfiles[doc.id] = doc.data(); });
    });
  }

  const tickets = querySnapshot.docs.map((d) => {
    const data = d.data();
    const reportedAt = data.reportedAt;
    let reportedAtStr = 'N/A';
    try {
      if (reportedAt?.toDate) {
        reportedAtStr = reportedAt.toDate().toLocaleDateString('th-TH');
      } else if (reportedAt instanceof Date) {
        reportedAtStr = reportedAt.toLocaleDateString('th-TH');
      } else if (typeof reportedAt === 'string') {
        reportedAtStr = reportedAt;
      }
    } catch (e) {
      console.warn("Error formatting reportedAt for ticket:", d.id, e);
    }

    return {
      id: d.id,
      ...data,
      clientName: userProfiles[data.userId]?.name || 'Unknown User',
      reportedAt: reportedAtStr,
    };
  });
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

  try {
    // 1. Parallelize counts using getCountFromServer (much faster and cheaper)
    const [
      totalUsersSnap,
      activeTicketsSnap,
      pendingLawyersSnap,
      approvedLawyersSnap
    ] = await Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(query(collection(db, 'tickets'), where('status', '==', 'pending'))),
      getCountFromServer(query(collection(db, 'lawyerProfiles'), where('status', '==', 'pending'))),
      getCountFromServer(query(collection(db, 'lawyerProfiles'), where('status', '==', 'approved')))
    ]);

    // For "new users this month", we still need to query with a filter
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newUsersSnap = await getCountFromServer(query(
      collection(db, 'users'),
      where('registeredAt', '>=', firstDayOfMonth)
    ));

    return {
      totalUsers: totalUsersSnap.data().count,
      newUsers: newUsersSnap.data().count,
      activeTicketsCount: activeTicketsSnap.data().count,
      pendingLawyersCount: pendingLawyersSnap.data().count,
      approvedLawyersCount: approvedLawyersSnap.data().count,
      totalRevenue: 0
    };
  } catch (error) {
    console.warn("Failed to fetch admin stats:", error);
    return {
      totalUsers: 0,
      newUsers: 0,
      activeTicketsCount: 0,
      pendingLawyersCount: 0,
      approvedLawyersCount: 0,
      totalRevenue: 0
    };
  }
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
    // Fetch in parallel
    const [appointmentsSnapshot, chatsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'appointments'), limit(500))),
      getDocs(query(collection(db, 'chats'), limit(500)))
    ]);

    appointmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status !== 'pending' && data.status !== 'pending_payment' && data.status !== 'cancelled') {
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
  let rating = 0;
  let responseRate = 0;

  try {
    // 1. Parallelize data fetching
    const [appointmentsSnapshot, chatsSnapshot, reviewsSnapshot, allChatsSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'appointments'), where('lawyerId', '==', lawyerId), where('status', '==', 'completed'), limit(200))),
      getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', lawyerId), limit(500))),
      getDocs(query(collection(db, 'reviews'), where('lawyerId', '==', lawyerId), limit(200))),
      getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', lawyerId), limit(500)))
    ]);

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

    if (!reviewsSnapshot.empty) {
      const totalRating = reviewsSnapshot.docs.reduce((acc, doc) => acc + (doc.data().rating || 0), 0);
      rating = totalRating / reviewsSnapshot.size;
    }

    if (!allChatsSnapshot.empty) {
      const engagedChats = allChatsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'active' || data.status === 'closed';
      }).length;

      const totalRequests = allChatsSnapshot.docs.filter(doc => doc.data().status !== 'pending_payment').length;

      if (totalRequests > 0) {
        responseRate = (engagedChats / totalRequests) * 100;
      } else {
        responseRate = 100;
      }
    } else {
      responseRate = 100;
    }

  } catch (error) {
    console.error("Error calculating lawyer stats:", error);
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

export async function syncLawyersToRegistry(db: Firestore): Promise<{ success: number; total: number }> {
  if (!db) return { success: 0, total: 0 };
  try {
    const lawyersRef = collection(db, 'lawyerProfiles');
    const querySnapshot = await getDocs(lawyersRef);
    const lawyers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LawyerProfile));

    let successCount = 0;
    const batchSize = 400; // Firestore limit is 500

    for (let i = 0; i < lawyers.length; i += batchSize) {
      const chunk = lawyers.slice(i, i + batchSize);
      const batch = writeBatch(db);

      chunk.forEach(lawyer => {
        if (lawyer.licenseNumber) {
          // Sanitize license number for use as document ID (replace / with -)
          const docId = lawyer.licenseNumber.replace(/\//g, '-');
          const verifiedRef = doc(db, 'verifiedLawyers', docId);

          const firstName = lawyer.name.split(' ')[0] || '';
          const lastName = lawyer.name.split(' ').slice(1).join(' ') || '';

          batch.set(verifiedRef, {
            licenseNumber: lawyer.licenseNumber,
            firstName,
            lastName,
            province: lawyer.serviceProvinces?.[0] || lawyer.address || '',
            status: lawyer.status === 'approved' ? 'active' : 'pending',
            registeredDate: lawyer.joinedAt?.toDate ? lawyer.joinedAt.toDate().toISOString() : (lawyer.joinedAt || new Date().toISOString()),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          successCount++;
        }
      });

      await batch.commit();
    }

    return { success: successCount, total: lawyers.length };
  } catch (error) {
    console.error("[syncLawyersToRegistry] Error syncing lawyers:", error);
    throw error;
  }
}