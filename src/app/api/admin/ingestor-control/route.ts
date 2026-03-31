import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { setSystemPaused } from '@/lib/ingestion-store';
import path from 'path';

/**
 * Control API moved to lawslane-admin to manage the platform's RAG ingestors
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;
        
        // Since ingestor scripts are in the main Lawslane repo, we use an absolute path
        const MAIN_REPO_PATH = '/Users/tawanberkfah/Documents/GitHub/Lawslane';

        if (action === 'pause') {
            console.log('🛑 Admin: Pausing ingestion system...');
            setSystemPaused(true);
            
            // Kill supervisor and any python ingestors in the machine
            const killCmd = `pkill -f supervisor.sh; pkill -f ingest-ratchakitcha; pkill -f ingest-krisdika; pkill -f ingest-ratchakitcha-historical.py`;
            
            exec(killCmd, (error) => {
                if (error) {
                    console.log('Note: Processes might be already stopped:', error.message);
                }
            });
            
            return NextResponse.json({ success: true, message: 'Ingestion paused across system' });
        } 
        
        if (action === 'resume') {
            console.log('🚀 Admin: Resuming ingestion system...');
            setSystemPaused(false);
            
            const supervisorPath = path.join(MAIN_REPO_PATH, 'scripts', 'supervisor.sh');
            // Run supervisor from the main repo context
            const resumeCmd = `cd ${MAIN_REPO_PATH} && nohup ${supervisorPath} > supervisor.log 2>&1 &`;
            
            exec(resumeCmd, (error) => {
                if (error) {
                    console.error('Failed to resume supervisor in main repo:', error);
                }
            });
            
            return NextResponse.json({ success: true, message: 'Ingestion resumed in Lawslane repo' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
