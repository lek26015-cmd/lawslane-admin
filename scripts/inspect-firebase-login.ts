
// @ts-expect-error missing type definitions
import * as fb from 'firebase-tools';
if ((fb as any).login) {
    console.log('login exports:', Object.keys((fb as any).login));
} else {
    console.log('login not exported');
}
