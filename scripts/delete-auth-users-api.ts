
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { LEGACY_SUPER_ADMIN_UIDS } from '../src/lib/super-admin';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const KEEP_UID = LEGACY_SUPER_ADMIN_UIDS[0];
const CONFIG_PATH = '/Users/tawanberkfah/.config/configstore/firebase-tools.json';
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
// Public client secret for Firebase CLI (often not needed or is public)
const CLIENT_SECRET = '3n1Eq...'; // Placeholder, trying without first or with known one if needed.
// Actually, for installed apps, secret is often not required or is "notasecret".

async function getAccessToken() {
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(content);
    const tokens = config.tokens;

    if (!tokens) throw new Error('No tokens found in firebase-tools config');

    // Try using current access token
    // We can validate it by making a simple call, or just try to refresh immediately if we suspect it's old.
    // Let's try to refresh to be safe.

    console.log('Refreshing access token...');
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('refresh_token', tokens.refresh_token);
    params.append('grant_type', 'refresh_token');
    // params.append('client_secret', CLIENT_SECRET); // Try without first

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    const data = await response.json();
    if (data.error) {
        console.error('Error refreshing token:', data);
        // Fallback: try using the existing access_token if refresh failed (maybe client secret needed)
        console.log('Falling back to existing access token...');
        return tokens.access_token;
    }

    return data.access_token;
}

async function listUsers(accessToken: string) {
    console.log('Listing users...');
    const users: any[] = [];
    let nextPageToken = '';

    do {
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:download?nextPageToken=${nextPageToken}&maxResults=100`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(`Error listing users: ${JSON.stringify(data.error)}`);
        }

        if (data.users) {
            users.push(...data.users);
        }
        nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return users;
}

async function deleteUsers(accessToken: string, uids: string[]) {
    console.log(`Deleting ${uids.length} users...`);

    // Batch delete allows up to ? maybe 50?
    // Let's do chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < uids.length; i += chunkSize) {
        const chunk = uids.slice(i, i + chunkSize);

        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:batchDelete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ localIds: chunk })
        });

        const data = await response.json();
        if (data.error) {
            console.error(`Error deleting chunk ${i}:`, data.error);
        } else {
            console.log(`Deleted chunk ${i} - ${i + chunk.length}`);
        }
    }
}

async function main() {
    try {
        const accessToken = await getAccessToken();
        const users = await listUsers(accessToken);
        console.log(`Found ${users.length} users.`);

        const usersToDelete = users
            .filter((u: any) => u.localId !== KEEP_UID)
            .map((u: any) => u.localId);

        if (usersToDelete.length === 0) {
            console.log('No users to delete.');
            return;
        }

        await deleteUsers(accessToken, usersToDelete);
        console.log('Deletion complete.');
    } catch (error) {
        console.error(error);
    }
}

main();
