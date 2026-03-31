// Shared status store for ingestion tasks in Lawslane-admin
export interface IngestionStatus {
    status: 'active' | 'cooling_down' | 'idle' | 'error' | 'paused';
    lastUpdate: string;
    message?: string;
    nextRetry?: string;
}

export const statusStore: Record<string, IngestionStatus> = {
    'ratchakitcha': { status: 'idle', lastUpdate: new Date().toISOString() },
    'krisdika': { status: 'idle', lastUpdate: new Date().toISOString() },
    'historical': { status: 'idle', lastUpdate: new Date().toISOString() },
    'pdf_ingestor': { status: 'idle', lastUpdate: new Date().toISOString() }
};

export let systemPaused = false;

export function setSystemPaused(paused: boolean) {
    systemPaused = paused;
    if (paused) {
        Object.keys(statusStore).forEach(task => {
            if (statusStore[task].status !== 'idle') {
                statusStore[task].status = 'paused';
                statusStore[task].message = 'Manually paused by user';
            }
        });
    }
}
