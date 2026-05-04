/**
 * Stub for NotificationService to resolve build errors in admin repo.
 * In the admin dashboard, we don't necessarily need to trigger all emails
 * that the main app does, or we can implement them via simple logs/API calls.
 */
export const NotificationService = {
    notifyLawyerNewChat: async (data: any) => {
        console.log('[NotificationService Stub] notifyLawyerNewChat:', data);
        return { success: true };
    },
    notifyClientNewChat: async (data: any) => {
        console.log('[NotificationService Stub] notifyClientNewChat:', data);
        return { success: true };
    },
    notifyClientFeeRequested: async (data: any) => {
        console.log('[NotificationService Stub] notifyClientFeeRequested:', data);
        return { success: true };
    },
    notifyPaymentReceived: async (data: any) => {
        console.log('[NotificationService Stub] notifyPaymentReceived:', data);
        return { success: true };
    },
    notifyClientPaymentConfirmation: async (data: any) => {
        console.log('[NotificationService Stub] notifyClientPaymentConfirmation:', data);
        return { success: true };
    },
    notifyAdminPaymentReceived: async (data: any) => {
        console.log('[NotificationService Stub] notifyAdminPaymentReceived:', data);
        return { success: true };
    },
    sendEmail: async (to: string, subject: string, body: string) => {
        console.log('[NotificationService Stub] sendEmail:', { to, subject });
        return { success: true };
    }
};
